from backend.models.tables import Conversation, Handoff, Message, get_or_create_settings
from backend.routers.chat import list_agent_messages
from backend.routers.handoffs import reply_handoff
from backend.schemas.handoffs import ReplyRequest
from backend.services.handoff_delivery import deliver_agent_reply


def _pending_handoff(db_session, *, channel: str, customer_ref: str) -> Handoff:
    conv = Conversation(channel=channel, customer_ref=customer_ref, status="handoff")
    db_session.add(conv)
    db_session.commit()
    db_session.refresh(conv)
    handoff = Handoff(conversation_id=conv.id, status="pending", reason="support_request")
    db_session.add(handoff)
    db_session.add(Message(conversation_id=conv.id, role="user", content="help"))
    db_session.commit()
    db_session.refresh(handoff)
    return handoff


def test_reply_handoff_saves_and_sends_telegram(db_session, monkeypatch):
    handoff = _pending_handoff(db_session, channel="telegram", customer_ref="tg:12345")
    setting = get_or_create_settings(db_session)
    setting.is_telegram_active = True
    setting.telegram_token = "token"
    db_session.commit()

    sent = []

    def fake_send(token, chat_id, text):
        sent.append((token, chat_id, text))

    monkeypatch.setattr("backend.services.handoff_delivery.telegram_send_message", fake_send)

    response = reply_handoff(handoff.id, ReplyRequest(content=" I can help. "), db_session)

    assert sent == [("token", 12345, "I can help.")]
    assert response.metadata["delivery"]["ok"] is True
    assert response.messages[-1].role == "agent"
    assert response.messages[-1].content == "I can help."


def test_deliver_agent_reply_reports_web_polling(db_session):
    handoff = _pending_handoff(db_session, channel="web", customer_ref="session-1")
    conv = handoff.conversation

    result = deliver_agent_reply(conv, "hello from support", db_session)

    assert result.ok is True
    assert result.channel == "web"
    assert result.mode == "polling"


def test_list_agent_messages_returns_only_new_agent_replies(db_session):
    handoff = _pending_handoff(db_session, channel="web", customer_ref="session-1")
    db_session.add(Message(conversation_id=handoff.conversation_id, role="assistant", content="waiting"))
    first = Message(conversation_id=handoff.conversation_id, role="agent", content="first reply")
    second = Message(conversation_id=handoff.conversation_id, role="agent", content="second reply")
    db_session.add_all([first, second])
    db_session.commit()
    db_session.refresh(first)

    rows = list_agent_messages("session-1", after_id=first.id, db=db_session)

    assert [row.content for row in rows] == ["second reply"]
    assert all(row.role == "agent" for row in rows)
