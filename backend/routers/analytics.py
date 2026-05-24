"""GET /api/analytics — drives the dashboard KPIs, charts, and queue."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.models.database import get_db
from backend.schemas.analytics import AnalyticsResponse
from backend.services.analytics import get_analytics_snapshot

from backend.core.security import get_tenant_key

router = APIRouter()


@router.get("/api/analytics", response_model=AnalyticsResponse)
def get_analytics(
    tenant_key: str | None = Depends(get_tenant_key),
    db: Session = Depends(get_db)
) -> AnalyticsResponse:
    return get_analytics_snapshot(db, tenant_key=tenant_key)
