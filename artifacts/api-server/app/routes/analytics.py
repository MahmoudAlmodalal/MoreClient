from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.schemas import AnalyticsResponse
from app.services.analytics import build_analytics

router = APIRouter()


@router.get("/analytics", response_model=AnalyticsResponse)
async def analytics(
    auth: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    return await build_analytics(db, auth["tid"])


@router.get("/analytics/dashboard", response_model=AnalyticsResponse)
async def analytics_dashboard(
    auth: Annotated[dict, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    return await build_analytics(db, auth["tid"])
