"""Workflow, run and log endpoints (Phases 7-10)."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import WorkspaceContext, get_workspace_ctx, require_workspace_role, get_current_user
from app.core.database import get_db
from app.core.enums import TriggerType, WorkspaceRole
from app.models.user import User
from app.schemas.common import Message
from app.schemas.workflow import (
    TriggerRunRequest,
    WorkflowCreate,
    WorkflowRead,
    WorkflowRunDetail,
    WorkflowRunRead,
    WorkflowUpdate,
    WorkflowCommentCreate,
    WorkflowCommentRead,
    WorkflowShareCreate,
    WorkflowShareRead,
    ActivityLogRead,
    OwnershipTransferRequest,
)

from app.services.workflow_service import WorkflowService

router = APIRouter(prefix="/workspaces/{workspace_id}/workflows", tags=["workflows"])


@router.get("", response_model=list[WorkflowRead])
async def list_workflows(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await WorkflowService(db).list(ctx.workspace.id, user=user)


@router.post("", response_model=WorkflowRead, status_code=201)
async def create_workflow(
    data: WorkflowCreate,
    ctx: WorkspaceContext = Depends(require_workspace_role(WorkspaceRole.MEMBER)),
    db: AsyncSession = Depends(get_db),
):
    return await WorkflowService(db).create(ctx.workspace.id, data, ctx.member.user_id)


@router.get("/{workflow_id}", response_model=WorkflowRead)
async def get_workflow(
    workflow_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await WorkflowService(db).get(ctx.workspace.id, workflow_id, user=user)


@router.patch("/{workflow_id}", response_model=WorkflowRead)
async def update_workflow(
    workflow_id: uuid.UUID,
    data: WorkflowUpdate,
    ctx: WorkspaceContext = Depends(require_workspace_role(WorkspaceRole.MEMBER)),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkflowService(db)
    wf = await svc.get(ctx.workspace.id, workflow_id, user=user)
    return await svc.update(wf, data, actor_id=ctx.member.user_id)



@router.delete("/{workflow_id}", response_model=Message)
async def delete_workflow(
    workflow_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(require_workspace_role(WorkspaceRole.MAINTAINER)),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Message:
    svc = WorkflowService(db)
    wf = await svc.get(ctx.workspace.id, workflow_id, user=user)
    await svc.delete(wf, actor_id=ctx.member.user_id)
    return Message(detail="Workflow deleted")


@router.post("/{workflow_id}/regenerate-webhook", response_model=WorkflowRead)
async def regenerate_webhook(
    workflow_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(require_workspace_role(WorkspaceRole.MAINTAINER)),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkflowService(db)
    wf = await svc.get(ctx.workspace.id, workflow_id, user=user)
    return await svc.regenerate_webhook(wf, actor_id=ctx.member.user_id)


@router.post("/{workflow_id}/trigger", response_model=WorkflowRunRead, status_code=202)
async def trigger_workflow(
    workflow_id: uuid.UUID,
    data: TriggerRunRequest | None = None,
    ctx: WorkspaceContext = Depends(require_workspace_role(WorkspaceRole.MEMBER)),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkflowService(db)
    wf = await svc.get(ctx.workspace.id, workflow_id, user=user)
    return await svc.create_run(wf, trigger=TriggerType.MANUAL.value, user_id=ctx.member.user_id)


@router.get("/{workflow_id}/runs", response_model=list[WorkflowRunRead])
async def list_runs(
    workflow_id: uuid.UUID,
    limit: int = 50,
    offset: int = 0,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkflowService(db)
    wf = await svc.get(ctx.workspace.id, workflow_id, user=user)
    return await svc.list_runs(wf, limit=limit, offset=offset)


@router.get("/{workflow_id}/runs/{run_id}", response_model=WorkflowRunDetail)
async def get_run(
    workflow_id: uuid.UUID,
    run_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkflowService(db)
    await svc.get(ctx.workspace.id, workflow_id, user=user)
    return await svc.get_run(ctx.workspace.id, run_id)


@router.post("/{workflow_id}/runs/{run_id}/cancel", response_model=WorkflowRunRead)
async def cancel_run(
    workflow_id: uuid.UUID,
    run_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(require_workspace_role(WorkspaceRole.MEMBER)),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkflowService(db)
    await svc.get(ctx.workspace.id, workflow_id, user=user)
    run = await svc.get_run(ctx.workspace.id, run_id)
    return await svc.cancel_run(run)


# --- Collaboration, Audit & Advanced Scheduling Endpoints ---

@router.get("/activity", response_model=list[ActivityLogRead])
async def get_workspace_activity(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await WorkflowService(db).get_activity_feed(ctx.workspace.id)


@router.post("/{workflow_id}/comments", response_model=WorkflowCommentRead, status_code=201)
async def add_workflow_comment(
    workflow_id: uuid.UUID,
    data: WorkflowCommentCreate,
    ctx: WorkspaceContext = Depends(require_workspace_role(WorkspaceRole.MEMBER)),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkflowService(db)
    # Check authorization
    await svc.get(ctx.workspace.id, workflow_id, user=ctx.member.user if hasattr(ctx.member, "user") else None)
    comment = await svc.add_comment(workflow_id, ctx.member.user_id, data.content)
    await svc.log_activity(ctx.workspace.id, ctx.member.user_id, "commented", "workflow", workflow_id, f"Commented: {data.content[:60]}")
    return comment


@router.get("/{workflow_id}/comments", response_model=list[WorkflowCommentRead])
async def list_workflow_comments(
    workflow_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkflowService(db)
    return await svc.list_comments(workflow_id)


@router.post("/{workflow_id}/shares", response_model=WorkflowShareRead, status_code=201)
async def share_workflow(
    workflow_id: uuid.UUID,
    data: WorkflowShareCreate,
    ctx: WorkspaceContext = Depends(require_workspace_role(WorkspaceRole.MAINTAINER)),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkflowService(db)
    share = await svc.share_workflow(workflow_id, data.user_id, data.team_name)
    await svc.log_activity(
        ctx.workspace.id, ctx.member.user_id, "shared", "workflow", workflow_id,
        f"Shared with user {data.user_id} or team {data.team_name}"
    )
    return share


@router.get("/{workflow_id}/shares", response_model=list[WorkflowShareRead])
async def list_workflow_shares(
    workflow_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await WorkflowService(db).list_shares(workflow_id)


@router.delete("/{workflow_id}/shares/{share_id}", response_model=Message)
async def delete_workflow_share(
    workflow_id: uuid.UUID,
    share_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(require_workspace_role(WorkspaceRole.MAINTAINER)),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkflowService(db)
    await svc.delete_share(share_id)
    await svc.log_activity(ctx.workspace.id, ctx.member.user_id, "unshared", "workflow", workflow_id, f"Revoked share ID {share_id}")
    return Message(detail="Share revoked")


@router.post("/{workflow_id}/transfer", response_model=WorkflowRead)
async def transfer_ownership(
    workflow_id: uuid.UUID,
    data: OwnershipTransferRequest,
    ctx: WorkspaceContext = Depends(require_workspace_role(WorkspaceRole.MAINTAINER)),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkflowService(db)
    wf = await svc.get(ctx.workspace.id, workflow_id, user=user)
    return await svc.transfer_ownership(wf, data.new_owner_id, user.id)


@router.post("/{workflow_id}/runs/{run_id}/replay", response_model=WorkflowRunRead, status_code=202)
async def replay_run(
    workflow_id: uuid.UUID,
    run_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(require_workspace_role(WorkspaceRole.MEMBER)),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = WorkflowService(db)
    run = await svc.get_run(ctx.workspace.id, run_id)
    wf = await svc.get(ctx.workspace.id, workflow_id, user=user)
    return await svc.create_run(wf, trigger="replay", user_id=user.id)


@router.post("/check-conflicts")
async def check_schedule_conflicts(
    cron: str,
    workflow_id: uuid.UUID | None = None,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    # Detect schedule conflicts to warn user
    from croniter import croniter
    from datetime import datetime, UTC
    from app.models.workflow import Workflow
    from sqlalchemy import select
    
    if not cron:
        return {"conflicts": []}
        
    stmt = select(Workflow).where(
        Workflow.workspace_id == ctx.workspace.id,
        Workflow.enabled.is_(True),
        Workflow.trigger_type == "schedule",
        Workflow.schedule_cron.is_not(None)
    )
    if workflow_id:
        stmt = stmt.where(Workflow.id != workflow_id)
        
    other_wfs = (await db.execute(stmt)).scalars().all()
    
    now = datetime.now(UTC)
    try:
        my_iter = croniter(cron, now)
        my_next_times = {my_iter.get_next(datetime) for _ in range(10)}
    except Exception:
        return {"conflicts": ["Invalid cron expression"]}
        
    conflicts = []
    for wf in other_wfs:
        try:
            other_iter = croniter(wf.schedule_cron, now)
            other_next_times = {other_iter.get_next(datetime) for _ in range(10)}
            overlap = my_next_times.intersection(other_next_times)
            if overlap:
                times_str = ", ".join(t.strftime("%H:%M") for t in sorted(list(overlap))[:3])
                conflicts.append(f"Overlaps with '{wf.name}' schedule at {times_str} (Resource contention warning)")
        except Exception:
            continue
            
    return {"conflicts": conflicts}


@router.get("/dashboard/heatmap")
async def get_heatmap(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timedelta, UTC
    from sqlalchemy import select
    from app.models.workflow import WorkflowRun
    
    cutoff = datetime.now(UTC) - timedelta(days=30)
    stmt = select(WorkflowRun.created_at).where(
        WorkflowRun.workspace_id == ctx.workspace.id,
        WorkflowRun.created_at >= cutoff
    )
    res = await db.execute(stmt)
    created_ats = res.scalars().all()
    
    heatmap = {}
    for dt in created_ats:
        day = dt.weekday()
        hour = dt.hour
        key = (day, hour)
        heatmap[key] = heatmap.get(key, 0) + 1
        
    data = []
    for day in range(7):
        for hour in range(24):
            count = heatmap.get((day, hour), 0)
            data.append({"day": day, "hour": hour, "count": count})
    return data

