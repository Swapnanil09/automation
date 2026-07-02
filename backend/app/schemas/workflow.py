"""Workflow, run and step schemas (Phases 7, 9, 10)."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.core.enums import TriggerType
from app.schemas.common import ORMModel


class WorkflowCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str | None = None
    definition: str = ""  # YAML
    trigger_type: TriggerType = TriggerType.MANUAL
    schedule_cron: str | None = None
    schedule_tz: str | None = "UTC"
    enabled: bool = True
    email_on_failure: bool = False
    priority: str = "Medium"
    blackout_start: str | None = None
    blackout_end: str | None = None


class WorkflowUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = None
    definition: str | None = None
    trigger_type: TriggerType | None = None
    schedule_cron: str | None = None
    schedule_tz: str | None = None
    enabled: bool | None = None
    email_on_failure: bool | None = None
    priority: str | None = None
    blackout_start: str | None = None
    blackout_end: str | None = None
    owner_id: uuid.UUID | None = None


class WorkflowRead(ORMModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    slug: str
    description: str | None
    definition: str
    trigger_type: str
    schedule_cron: str | None
    schedule_tz: str | None
    next_runs: list[str] | None = None
    enabled: bool
    email_on_failure: bool
    webhook_token: str | None
    priority: str
    blackout_start: str | None
    blackout_end: str | None
    owner_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime



class StepRunRead(ORMModel):
    id: uuid.UUID
    name: str
    step_index: int
    status: str
    command: str
    exit_code: int | None
    started_at: str | None
    finished_at: str | None
    logs: str


class WorkflowRunRead(ORMModel):
    id: uuid.UUID
    workflow_id: uuid.UUID
    workspace_id: uuid.UUID
    run_number: int
    status: str
    trigger: str
    commit_sha: str | None
    started_at: str | None
    finished_at: str | None
    error: str | None
    created_at: datetime


class WorkflowRunDetail(WorkflowRunRead):
    steps: list[StepRunRead] = []


class TriggerRunRequest(BaseModel):
    ref: str | None = None  # optional git ref / branch


class WorkflowCommentCreate(BaseModel):
    content: str = Field(min_length=1)


class WorkflowCommentRead(ORMModel):
    id: uuid.UUID
    workflow_id: uuid.UUID
    user_id: uuid.UUID
    content: str
    created_at: datetime
    updated_at: datetime


class WorkflowShareCreate(BaseModel):
    user_id: uuid.UUID | None = None
    team_name: str | None = None


class WorkflowShareRead(ORMModel):
    id: uuid.UUID
    workflow_id: uuid.UUID
    user_id: uuid.UUID | None
    team_name: str | None
    created_at: datetime


class ActivityLogRead(ORMModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    action: str
    entity_type: str
    entity_id: uuid.UUID
    details: str | None
    created_at: datetime


class OwnershipTransferRequest(BaseModel):
    new_owner_id: uuid.UUID

