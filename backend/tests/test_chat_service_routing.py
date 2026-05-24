from backend.models.tables import Handoff, PurchaseOrder
from backend.services.chat_service import ChatService


def test_chat_service_routes_purchase_intent(db_session, monkeypatch):
    monkeypatch.setattr(
        "backend.services.purchase_flow._match_product",
        lambda product_hint: {"product_name": product_hint},
    )

    response = ChatService(db_session).handle(
        session_id="purchase-user",
        message="أريد شراء عطر المسك",
        channel="web",
    )

    order = db_session.query(PurchaseOrder).one()
    assert response.escalate is False
    assert order.product_name == "عطر المسك"
    assert order.state == "collecting_quantity"


def test_chat_service_routes_complaint_to_handoff(db_session):
    response = ChatService(db_session).handle(
        session_id="complaint-user",
        message="عندي مشكلة في الطلب",
        channel="web",
    )

    handoff = db_session.query(Handoff).one()
    assert response.escalate is True
    assert handoff.reason == "complaint"


def test_chat_service_preserves_low_confidence_handoff(db_session, monkeypatch):
    monkeypatch.setattr("backend.services.chat_service.vectorstore.is_empty", lambda: True)
    response = ChatService(db_session).handle(
        session_id="unknown-user",
        message="What is your policy for something not in the KB?",
        channel="web",
    )

    handoff = db_session.query(Handoff).one()
    assert response.escalate is True
    assert handoff.reason == "low_confidence"
