import pytest
from fastapi import WebSocketDisconnect

from backend.models.tables import Conversation, Handoff, LearnedAnswer, Message
from backend.routers import learn, ws
from backend.schemas.learn import LearnRequest
from backend.services.analytics import get_analytics_snapshot


def _seed_pending_handoff(db_session) -> Handoff:
    conv = Conversation(
        channel="web",
        tenant_key="default",
        customer_ref="session-1",
        status="handoff",
    )
    db_session.add(conv)
    db_session.commit()
    db_session.refresh(conv)

    db_session.add_all(
        [
            Message(conversation_id=conv.id, role="user", content="What are your hours?"),
            Message(conversation_id=conv.id, role="assistant", content="I will ask support."),
        ]
    )
    handoff = Handoff(conversation_id=conv.id, reason="low_confidence", status="pending")
    db_session.add(handoff)
    db_session.commit()
    db_session.refresh(handoff)
    return handoff


def test_analytics_service_returns_dashboard_shape(db_session):
    handoff = _seed_pending_handoff(db_session)

    snapshot = get_analytics_snapshot(db_session)

    assert snapshot.kpis.total_questions == 1
    assert snapshot.top_questions[0].name == "What are your hours?"
    assert snapshot.channel_distribution[0].name == "Web"
    assert snapshot.unanswered[0].id == handoff.id


def test_learn_with_source_handoff_resolves_unanswered_item(db_session, monkeypatch):
    handoff = _seed_pending_handoff(db_session)

    monkeypatch.setattr(learn.embeddings, "embed_query", lambda text: [0.1, 0.2])
    monkeypatch.setattr(learn.vectorstore, "add_learned", lambda *args, **kwargs: None)
    monkeypatch.setattr(learn, "broadcast_dashboard_snapshot", lambda reason: None)

    response = learn.learn(
        LearnRequest(
            question="What are your hours?",
            answer="We are open from 9 to 5.",
            source_handoff_id=handoff.id,
        ),
        db_session,
    )

    assert response.status == "learned"
    assert db_session.query(LearnedAnswer).count() == 1

    db_session.refresh(handoff)
    assert handoff.status == "resolved"
    assert handoff.resolved_at is not None
    assert get_analytics_snapshot(db_session).unanswered == []


class FakeDashboardWebSocket:
    def __init__(self) -> None:
        self.accepted = False
        self.messages = []

    async def accept(self) -> None:
        self.accepted = True

    async def send_json(self, payload) -> None:
        self.messages.append(payload)

    async def receive_text(self) -> str:
        raise WebSocketDisconnect()


@pytest.mark.asyncio
async def test_dashboard_websocket_sends_initial_snapshot(db_session, monkeypatch):
    _seed_pending_handoff(db_session)
    websocket = FakeDashboardWebSocket()
    monkeypatch.setattr(
        ws,
        "build_dashboard_snapshot_message",
        lambda reason: {
            "type": "analytics.snapshot",
            "reason": reason,
            "data": get_analytics_snapshot(db_session).model_dump(),
        },
    )

    await ws.dashboard_ws(websocket)
    message = websocket.messages[0]

    assert websocket.accepted is True
    assert message["type"] == "analytics.snapshot"
    assert message["reason"] == "initial"
    assert message["data"]["kpis"]["total_questions"] == 1
    assert len(message["data"]["unanswered"]) == 1
