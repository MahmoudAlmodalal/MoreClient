import pytest
from fastapi import HTTPException

from backend.models.tables import Conversation, PurchaseOrder
from backend.routers.purchases import get_purchase, list_purchases, update_purchase_status
from backend.schemas.purchase import PurchaseStatusUpdate


def _seed_order(db_session, tenant_key: str, product_name: str) -> PurchaseOrder:
    conversation = Conversation(
        channel="web",
        tenant_key=tenant_key,
        customer_ref=f"{tenant_key}-customer",
        status="open",
    )
    db_session.add(conversation)
    db_session.commit()
    db_session.refresh(conversation)

    order = PurchaseOrder(
        conversation_id=conversation.id,
        customer_ref=conversation.customer_ref,
        product_name=product_name,
        quantity=1,
        delivery_address="Gaza",
        status="pending",
        state="collecting_product",
    )
    db_session.add(order)
    db_session.commit()
    db_session.refresh(order)
    return order


def test_company_only_lists_its_own_purchase_orders(db_session):
    own_order = _seed_order(db_session, "tenant-a", "Coffee")
    _seed_order(db_session, "tenant-b", "Tea")

    orders = list_purchases(status=None, tenant_key="tenant-a", db=db_session)

    assert [order.id for order in orders] == [own_order.id]


def test_company_cannot_read_another_tenant_purchase_order(db_session):
    other_order = _seed_order(db_session, "tenant-b", "Tea")

    with pytest.raises(HTTPException) as exc:
        get_purchase(other_order.id, tenant_key="tenant-a", db=db_session)

    assert exc.value.status_code == 404


def test_company_cannot_update_another_tenant_purchase_order(db_session):
    other_order = _seed_order(db_session, "tenant-b", "Tea")

    with pytest.raises(HTTPException) as exc:
        update_purchase_status(
            other_order.id,
            PurchaseStatusUpdate(status="completed"),
            tenant_key="tenant-a",
            db=db_session,
        )

    assert exc.value.status_code == 404
    db_session.refresh(other_order)
    assert other_order.status == "pending"


def test_admin_can_update_any_purchase_order(db_session):
    order = _seed_order(db_session, "tenant-b", "Tea")

    updated = update_purchase_status(
        order.id,
        PurchaseStatusUpdate(status="completed"),
        tenant_key=None,
        db=db_session,
    )

    assert updated.status == "completed"
    assert updated.state == "completed"
