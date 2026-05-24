"""Purchase order management endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.models.database import get_db
from backend.models.tables import PurchaseOrder
from backend.schemas.purchase import PurchaseOrderOut, PurchaseStatusUpdate

router = APIRouter()

_ALLOWED_STATUSES = {"pending", "confirmed", "forwarded", "completed", "cancelled"}
_ACTIVE_STATES = {"collecting_product", "collecting_quantity", "collecting_address", "awaiting_confirmation"}


@router.get("/api/purchases", response_model=list[PurchaseOrderOut])
def list_purchases(status: str | None = None, db: Session = Depends(get_db)):
    query = db.query(PurchaseOrder)
    if status:
        query = query.filter(PurchaseOrder.status == status)
    orders = query.order_by(PurchaseOrder.created_at.desc(), PurchaseOrder.id.desc()).all()
    return [PurchaseOrderOut.model_validate(order) for order in orders]


@router.get("/api/purchases/active", response_model=list[PurchaseOrderOut])
def list_active_purchases(db: Session = Depends(get_db)):
    orders = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.status.in_(["pending", "confirmed"]))
        .filter(PurchaseOrder.state.in_(_ACTIVE_STATES))
        .order_by(PurchaseOrder.updated_at.desc(), PurchaseOrder.id.desc())
        .all()
    )
    return [PurchaseOrderOut.model_validate(order) for order in orders]


@router.get("/api/purchases/{order_id}", response_model=PurchaseOrderOut)
def get_purchase(order_id: int, db: Session = Depends(get_db)):
    order = db.get(PurchaseOrder, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return PurchaseOrderOut.model_validate(order)


@router.post("/api/purchases/{order_id}/status", response_model=PurchaseOrderOut)
def update_purchase_status(
    order_id: int,
    payload: PurchaseStatusUpdate,
    db: Session = Depends(get_db),
):
    if payload.status not in _ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid purchase status")
    order = db.get(PurchaseOrder, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    order.status = payload.status
    if payload.status in {"completed", "cancelled"}:
        order.state = payload.status
    db.commit()
    db.refresh(order)
    return PurchaseOrderOut.model_validate(order)
