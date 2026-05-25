from backend.models.tables import Conversation, Handoff
from backend.services.purchase_flow import advance_purchase_flow


class DummySetting:
    purchase_collect_address = True
    purchase_collect_quantity = True
    purchase_auto_forward_to_support = True
    purchase_confirmation_required = True
    purchase_session_minutes = 30


def test_purchase_flow_confirm_creates_handoff(db_session):
    conv = Conversation(channel="web", customer_ref="test-user", status="open")
    db_session.add(conv)
    db_session.commit()

    first = advance_purchase_flow(db_session, conv, "أريد شراء عطر المسك", DummySetting())
    assert "كم قطعة" in first.reply

    second = advance_purchase_flow(db_session, conv, "2", DummySetting())
    assert "عنوان" in second.reply

    third = advance_purchase_flow(db_session, conv, "الرياض شارع الملك", DummySetting())
    assert "ملخص طلبك" in third.reply

    final = advance_purchase_flow(db_session, conv, "نعم", DummySetting())
    assert final.escalated is True
    assert final.order is not None
    assert final.order.status == "forwarded"
    assert conv.status == "handoff"
    assert db_session.query(Handoff).one().reason == "purchase_complete"


def test_purchase_flow_cancel(db_session):
    conv = Conversation(channel="web", customer_ref="cancel-user", status="open")
    db_session.add(conv)
    db_session.commit()

    advance_purchase_flow(db_session, conv, "أريد شراء عطر", DummySetting())
    result = advance_purchase_flow(db_session, conv, "إلغاء", DummySetting())

    assert "إلغاء" in result.reply
    assert result.order is not None
    assert result.order.status == "cancelled"
