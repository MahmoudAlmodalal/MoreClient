"""GET /api/analytics — drives the dashboard KPIs, charts, and queue."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.models.database import get_db
from backend.schemas.analytics import AnalyticsResponse
from backend.services.analytics import get_analytics_snapshot

router = APIRouter()


@router.get("/api/analytics", response_model=AnalyticsResponse)
def get_analytics(db: Session = Depends(get_db)) -> AnalyticsResponse:
    return get_analytics_snapshot(db)
