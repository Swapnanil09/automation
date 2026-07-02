"""Celery tasks: workflow execution + the scheduled-dispatch beat task."""

from __future__ import annotations

from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from croniter import croniter
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.logging import logger
from app.repositories.workflow import WorkflowRepository  # noqa: F401 (kept for parity)
from app.workers.celery_app import celery_app
from app.workers.executor import execute_run
from app.workers.runner import create_run_sync, recently_dispatched

SCHED_TICK_SECONDS = 60


@celery_app.task(name="health.ping")
def ping() -> str:
    """Connectivity sanity check for the worker."""
    return "pong"


@celery_app.task(name="workflow.run", bind=True, max_retries=3)
def run_workflow(self, run_id: str) -> str:  # noqa: ANN001
    """Execute a single workflow run by id with automatic self-healing restarts."""
    import uuid

    from celery.exceptions import MaxRetriesExceededError

    from app.core.enums import RunStatus

    db = SessionLocal()
    try:
        status = execute_run(db, uuid.UUID(run_id))
        logger.info("Run %s finished: %s", run_id, status)

        # If the workflow execution failed, trigger self-healing retry
        if status == RunStatus.FAILED.value:
            try:
                countdown = 5 ** (self.request.retries + 1)
                logger.warning(
                    "Workflow run %s failed. Attempting self-healing restart "
                    "(retry %d/3) in %ds...",
                    run_id,
                    self.request.retries + 1,
                    countdown,
                )
                self.retry(countdown=countdown)
            except MaxRetriesExceededError:
                logger.error("Max retries exceeded for workflow run %s. No more retries.", run_id)

        return status
    finally:
        db.close()


def dispatch_connections(db: Session, now: datetime) -> int:
    """Fire any scheduled connection heartbeats/checks that are due."""
    import json
    from datetime import timedelta

    from sqlalchemy import select

    from app.core.crypto import decrypt
    from app.integrations.base import OutboundMessage
    from app.integrations.registry import build_channel
    from app.models.connection import Connection
    from app.models.delivery import Delivery

    fired = 0
    connections = list(
        db.execute(
            select(Connection).where(
                Connection.enabled.is_(True),
                Connection.schedule_cron.is_not(None),
                Connection.schedule_to.is_not(None),
            )
        ).scalars()
    )
    for conn in connections:
        cron = (conn.schedule_cron or "").strip()
        if not cron or not croniter.is_valid(cron):
            continue

        tz_name = conn.schedule_tz or "UTC"
        try:
            tz = ZoneInfo(tz_name)
        except Exception:
            tz = UTC

        now_tz = now.astimezone(tz)
        prev_fire = croniter(cron, now_tz).get_prev(datetime)
        if prev_fire.tzinfo is None:
            prev_fire = prev_fire.replace(tzinfo=tz)

        window_start = now.timestamp() - SCHED_TICK_SECONDS
        if prev_fire.timestamp() < window_start:
            continue

        # Prevent double-fire
        cutoff = datetime.now(UTC) - timedelta(seconds=55)
        res = db.execute(
            select(Delivery.id)
            .where(
                Delivery.connection_name == conn.name,
                Delivery.workspace_id == conn.workspace_id,
                Delivery.created_at >= cutoff,
            )
            .limit(1)
        ).first()
        if res is not None:
            continue

        try:
            config = json.loads(decrypt(conn.config_encrypted))
            channel = build_channel(conn.type, config)
            body = (
                f"Scheduled check from connection '{conn.name}' ({conn.type}) "
                f"at {now_tz.isoformat()}"
            )
            msg = OutboundMessage(
                recipients=[conn.schedule_to],
                subject=f"Scheduled check: {conn.name}",
                body=body,
                body_format="text",
                attachments=[],
            )

            delivery = Delivery(
                workspace_id=conn.workspace_id,
                workflow_name="Connection Schedule",
                step_name=f"Scheduled check ({conn.name})",
                channel=conn.type,
                connection_name=conn.name,
                recipients=conn.schedule_to,
                recipient_count=1,
                body_format="text",
                subject=f"Scheduled check: {conn.name}",
                attachment_count=0,
                status="executing",
                started_at=datetime.now(UTC).isoformat(),
            )
            db.add(delivery)
            db.commit()

            result = channel.send(msg)

            delivery.status = "delivered" if result.ok else "failed"
            delivery.detail = result.summary
            delivery.finished_at = datetime.now(UTC).isoformat()
            db.commit()
            fired += 1
            logger.info("Connection schedule test fired successfully for %s", conn.name)
        except Exception as exc:
            logger.error("Connection schedule test failed for %s: %s", conn.name, exc)

    return fired


def is_in_blackout(now_tz: datetime, start_str: str | None, end_str: str | None) -> bool:
    if not start_str or not end_str:
        return False
    try:
        from datetime import time
        sh, sm = map(int, start_str.split(":"))
        eh, em = map(int, end_str.split(":"))
        start_t = time(sh, sm)
        end_t = time(eh, em)
        now_t = now_tz.time()
        if start_t <= end_t:
            return start_t <= now_t <= end_t
        else:
            return now_t >= start_t or now_t <= end_t
    except Exception as exc:
        logger.error("Error parsing blackout window %s-%s: %s", start_str, end_str, exc)
        return False


@celery_app.task(name="schedule.dispatch")
def dispatch_scheduled() -> int:
    """Fire any cron-scheduled workflows or connections that are due in this tick window."""
    from sqlalchemy import select

    from app.models.workflow import Workflow

    now = datetime.now(UTC)
    fired = 0
    db = SessionLocal()
    try:
        # 1. Dispatch connection schedules
        fired += dispatch_connections(db, now)

        # 2. Dispatch workflow schedules
        workflows = list(
            db.execute(
                select(Workflow).where(
                    Workflow.enabled.is_(True),
                    Workflow.trigger_type == "schedule",
                    Workflow.schedule_cron.is_not(None),
                )
            ).scalars()
        )
        for wf in workflows:
            cron = (wf.schedule_cron or "").strip()
            if not cron or not croniter.is_valid(cron):
                continue

            # Resolve target timezone
            tz_name = getattr(wf, "schedule_tz", None) or "UTC"
            try:
                tz = ZoneInfo(tz_name)
            except Exception:
                tz = UTC

            # Localize now to the target timezone
            now_tz = now.astimezone(tz)
            
            # Enforce blackout window check
            if is_in_blackout(now_tz, wf.blackout_start, wf.blackout_end):
                logger.info(
                    "Skipping scheduled execution of '%s' - currently in blackout window (%s to %s)",
                    wf.name, wf.blackout_start, wf.blackout_end
                )
                continue

            prev_fire = croniter(cron, now_tz).get_prev(datetime)
            if prev_fire.tzinfo is None:
                prev_fire = prev_fire.replace(tzinfo=tz)

            window_start = now.timestamp() - SCHED_TICK_SECONDS
            if prev_fire.timestamp() < window_start:
                continue
            if recently_dispatched(db, wf.id):
                continue
            run = create_run_sync(db, wf, trigger="schedule")
            if run is not None:
                prio_map = {"High": 9, "Medium": 5, "Low": 1}
                prio_val = prio_map.get(wf.priority, 5)
                run_workflow.apply_async(args=[str(run.id)], priority=prio_val)
                fired += 1
                logger.info("Scheduled run #%s queued for '%s' with priority %s", run.run_number, wf.name, wf.priority)
    finally:
        db.close()
    return fired
