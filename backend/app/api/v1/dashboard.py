"""Dashboard aggregate endpoint (Phase 12)."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardStats, RecentRun
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def dashboard_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardStats:
    return await DashboardService(db).stats(user.id, user.is_superuser)


@router.get("/runs", response_model=list[RecentRun])
async def dashboard_runs(
    limit: int = 200,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[RecentRun]:
    return await DashboardService(db).runs(user.id, user.is_superuser, limit=limit)
