"""Workflow CRUD and run orchestration (Phases 7, 8, 9)."""

from __future__ import annotations

import re
import secrets as _secrets
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import RunStatus, TriggerType
from app.core.exceptions import AppException, ConflictError, NotFoundError
from app.models.workflow import StepRun, Workflow, WorkflowRun
from app.repositories.workflow import RunRepository, StepRepository, WorkflowRepository
from app.schemas.workflow import WorkflowCreate, WorkflowUpdate
from app.workers.parser import WorkflowParseError, parse_workflow


def _slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "workflow"


class WorkflowService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = WorkflowRepository(db)
        self.runs = RunRepository(db)
        self.steps = StepRepository(db)

    async def _unique_slug(self, workspace_id: uuid.UUID, name: str) -> str:
        base = _slugify(name)
        slug = base
        i = 2
        while await self.repo.get_by_slug(workspace_id, slug):
            slug = f"{base}-{i}"
            i += 1
        return slug

    @staticmethod
    def _validate(definition: str) -> None:
        if definition and definition.strip():
            try:
                parse_workflow(definition)
            except WorkflowParseError as exc:
                raise AppException(str(exc), status_code=422) from exc

    async def list(self, workspace_id: uuid.UUID, user: User | None = None) -> list[Workflow]:
        wfs = await self.repo.list_for_workspace(workspace_id)
        if not user or user.is_superuser:
            return wfs
        from app.models.workflow import WorkflowShare
        from sqlalchemy import select
        stmt = select(WorkflowShare.workflow_id).where(WorkflowShare.user_id == user.id)
        shared_ids = set((await self.db.execute(stmt)).scalars())
        return [
            w for w in wfs
            if w.created_by_id == user.id or w.owner_id == user.id or w.id in shared_ids
        ]

    async def get(self, workspace_id: uuid.UUID, workflow_id: uuid.UUID, user: User | None = None) -> Workflow:
        wf = await self.repo.get(workflow_id)
        if wf is None or wf.workspace_id != workspace_id:
            raise NotFoundError("Workflow not found")
        if user and not user.is_superuser:
            if wf.created_by_id != user.id and wf.owner_id != user.id:
                from app.models.workflow import WorkflowShare
                from sqlalchemy import select
                stmt = select(WorkflowShare).where(
                    WorkflowShare.workflow_id == wf.id,
                    WorkflowShare.user_id == user.id
                )
                shares = await self.db.execute(stmt)
                if not shares.scalars().first():
                    from app.core.exceptions import ForbiddenError
                    raise ForbiddenError("You are not authorized to access this schedule")
        return wf

    async def create(
        self, workspace_id: uuid.UUID, data: WorkflowCreate, user_id: uuid.UUID
    ) -> Workflow:
        self._validate(data.definition)
        slug = await self._unique_slug(workspace_id, data.name)
        token = _secrets.token_urlsafe(24) if data.trigger_type == TriggerType.WEBHOOK else None
        wf = Workflow(
            workspace_id=workspace_id,
            name=data.name,
            slug=slug,
            description=data.description,
            definition=data.definition,
            trigger_type=data.trigger_type.value,
            schedule_cron=data.schedule_cron,
            schedule_tz=data.schedule_tz or "UTC",
            enabled=data.enabled,
            email_on_failure=data.email_on_failure,
            webhook_token=token,
            created_by_id=user_id,
            owner_id=user_id,
            priority=data.priority or "Medium",
            blackout_start=data.blackout_start,
            blackout_end=data.blackout_end,
        )
        wf = await self.repo.add(wf)
        await self.db.refresh(wf)
        await self.log_activity(workspace_id, user_id, "created", "workflow", wf.id, f"Created workflow '{wf.name}'")
        return wf

    async def update(self, wf: Workflow, data: WorkflowUpdate, actor_id: uuid.UUID | None = None) -> Workflow:
        if data.definition is not None:
            self._validate(data.definition)
            wf.definition = data.definition
        if data.name is not None:
            wf.name = data.name
        if data.description is not None:
            wf.description = data.description
        if data.trigger_type is not None:
            wf.trigger_type = data.trigger_type.value
            if data.trigger_type == TriggerType.WEBHOOK and not wf.webhook_token:
                wf.webhook_token = _secrets.token_urlsafe(24)
        if data.schedule_cron is not None:
            wf.schedule_cron = data.schedule_cron or None
        if data.schedule_tz is not None:
            wf.schedule_tz = data.schedule_tz or "UTC"
        if data.enabled is not None:
            wf.enabled = data.enabled
        if data.email_on_failure is not None:
            wf.email_on_failure = data.email_on_failure
        if data.priority is not None:
            wf.priority = data.priority
        if data.blackout_start is not None:
            wf.blackout_start = data.blackout_start
        if data.blackout_end is not None:
            wf.blackout_end = data.blackout_end
        if data.owner_id is not None:
            wf.owner_id = data.owner_id

        await self.db.flush()
        await self.db.refresh(wf)
        if actor_id:
            await self.log_activity(wf.workspace_id, actor_id, "updated", "workflow", wf.id, f"Updated workflow '{wf.name}'")
        return wf

    async def delete(self, wf: Workflow, actor_id: uuid.UUID | None = None) -> None:
        workspace_id = wf.workspace_id
        wf_id = wf.id
        wf_name = wf.name
        await self.repo.delete(wf)
        if actor_id:
            await self.log_activity(workspace_id, actor_id, "deleted", "workflow", wf_id, f"Deleted workflow '{wf_name}'")

    async def regenerate_webhook(self, wf: Workflow, actor_id: uuid.UUID | None = None) -> Workflow:
        wf.webhook_token = _secrets.token_urlsafe(24)
        await self.db.flush()
        if actor_id:
            await self.log_activity(wf.workspace_id, actor_id, "regenerated-webhook", "workflow", wf.id, f"Regenerated webhook token for '{wf.name}'")
        return wf

    # --- collaboration & audit ---------------------------------------------
    async def log_activity(
        self, workspace_id: uuid.UUID, user_id: uuid.UUID, action: str, entity_type: str, entity_id: uuid.UUID, details: str | None = None
    ) -> None:
        from app.models.workflow import ActivityLog
        log = ActivityLog(
            workspace_id=workspace_id,
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
        )
        self.db.add(log)
        await self.db.flush()

    async def get_activity_feed(self, workspace_id: uuid.UUID, limit: int = 50) -> list[ActivityLog]:
        from app.models.workflow import ActivityLog
        from sqlalchemy import select
        stmt = select(ActivityLog).where(ActivityLog.workspace_id == workspace_id).order_by(ActivityLog.created_at.desc()).limit(limit)
        return list((await self.db.execute(stmt)).scalars())

    async def add_comment(self, workflow_id: uuid.UUID, user_id: uuid.UUID, content: str) -> WorkflowComment:
        from app.models.workflow import WorkflowComment
        comment = WorkflowComment(
            workflow_id=workflow_id,
            user_id=user_id,
            content=content
        )
        self.db.add(comment)
        await self.db.flush()

        import re
        mentions = re.findall(r"@(\w+)", content)
        if mentions:
            from app.models.user import User
            from app.models.notification import Notification
            from sqlalchemy import select
            for username in mentions:
                stmt = select(User).where(User.username == username)
                user = (await self.db.execute(stmt)).scalars().first()
                if user:
                    wf = await self.repo.get(workflow_id)
                    if wf:
                        self.db.add(
                            Notification(
                                user_id=user.id,
                                title=f"Mentioned in '{wf.name}' comments",
                                message=content[:120],
                                type="info",
                                link=f"/workspaces/{wf.workspace_id}/workflows/{wf.id}",
                                workspace_id=wf.workspace_id,
                            )
                        )
                        await self.db.flush()
        return comment

    async def list_comments(self, workflow_id: uuid.UUID) -> list[WorkflowComment]:
        from app.models.workflow import WorkflowComment
        from sqlalchemy import select
        stmt = select(WorkflowComment).where(WorkflowComment.workflow_id == workflow_id).order_by(WorkflowComment.created_at.asc())
        return list((await self.db.execute(stmt)).scalars())

    async def share_workflow(self, workflow_id: uuid.UUID, user_id: uuid.UUID | None, team_name: str | None) -> WorkflowShare:
        from app.models.workflow import WorkflowShare
        share = WorkflowShare(
            workflow_id=workflow_id,
            user_id=user_id,
            team_name=team_name
        )
        self.db.add(share)
        await self.db.flush()
        return share

    async def list_shares(self, workflow_id: uuid.UUID) -> list[WorkflowShare]:
        from app.models.workflow import WorkflowShare
        from sqlalchemy import select
        stmt = select(WorkflowShare).where(WorkflowShare.workflow_id == workflow_id)
        return list((await self.db.execute(stmt)).scalars())

    async def delete_share(self, share_id: uuid.UUID) -> None:
        from app.models.workflow import WorkflowShare
        share = await self.db.get(WorkflowShare, share_id)
        if share:
            await self.db.delete(share)
            await self.db.flush()

    async def transfer_ownership(self, wf: Workflow, new_owner_id: uuid.UUID, actor_id: uuid.UUID) -> Workflow:
        old_owner = wf.owner_id or wf.created_by_id
        wf.owner_id = new_owner_id
        await self.db.flush()
        await self.log_activity(
            workspace_id=wf.workspace_id,
            user_id=actor_id,
            action="transferred",
            entity_type="workflow",
            entity_id=wf.id,
            details=f"Transferred ownership from {old_owner} to {new_owner_id}"
        )
        return wf


    # --- runs ----------------------------------------------------------------
    async def create_run(
        self,
        wf: Workflow,
        *,
        trigger: str,
        user_id: uuid.UUID | None,
    ) -> WorkflowRun:
        if not wf.enabled:
            raise ConflictError("Workflow is disabled")
        try:
            parsed = parse_workflow(wf.definition, default_name=wf.name)
        except WorkflowParseError as exc:
            raise AppException(f"Cannot run: {exc}", status_code=422) from exc

        number = await self.runs.next_run_number(wf.id)
        run = WorkflowRun(
            workflow_id=wf.id,
            workspace_id=wf.workspace_id,
            run_number=number,
            status=RunStatus.QUEUED.value,
            trigger=trigger,
            triggered_by_id=user_id,
        )
        run = await self.runs.add(run)
        for idx, step in enumerate(parsed.steps):
            self.db.add(
                StepRun(run_id=run.id, name=step.name, step_index=idx, command=step.command_display)
            )
        await self.db.flush()
        # Commit so the row is visible to the worker process before dispatch.
        await self.db.commit()

        from app.workers.tasks import run_workflow

        async_result = run_workflow.delay(str(run.id))
        run.celery_task_id = async_result.id
        await self.db.flush()
        await self.db.commit()
        return run

    async def list_runs(
        self, wf: Workflow, *, limit: int = 50, offset: int = 0
    ) -> list[WorkflowRun]:
        return await self.runs.list_for_workflow(wf.id, limit=limit, offset=offset)

    async def get_run(self, workspace_id: uuid.UUID, run_id: uuid.UUID) -> WorkflowRun:
        run = await self.runs.get_with_steps(run_id)
        if run is None or run.workspace_id != workspace_id:
            raise NotFoundError("Run not found")
        return run

    async def cancel_run(self, run: WorkflowRun) -> WorkflowRun:
        if run.status in {
            RunStatus.SUCCESS.value,
            RunStatus.FAILED.value,
            RunStatus.CANCELLED.value,
        }:
            raise ConflictError("Run already finished")
        run.status = RunStatus.CANCELLED.value
        await self.db.flush()
        await self.db.commit()
        if run.celery_task_id:
            from app.workers.celery_app import celery_app

            celery_app.control.revoke(run.celery_task_id, terminate=True, signal="SIGKILL")
        return run
