import pytest
from fastapi import HTTPException

from backend.models.tables import Conversation, Document, Handoff
from backend.routers.files import delete_file, list_files
from backend.routers.handoffs import list_handoffs, reply_handoff, resolve_handoff
from backend.schemas.handoffs import ReplyRequest


def _seed_document(db_session, tenant_key: str, title: str) -> Document:
    document = Document(
        tenant_key=tenant_key,
        title=title,
        content=f"Content for {tenant_key}",
        file_type="txt",
        status="completed",
    )
    db_session.add(document)
    db_session.commit()
    db_session.refresh(document)
    return document


def _seed_handoff(db_session, tenant_key: str) -> Handoff:
    conversation = Conversation(
        channel="web",
        tenant_key=tenant_key,
        customer_ref=f"{tenant_key}-customer",
        status="handoff",
    )
    db_session.add(conversation)
    db_session.commit()
    db_session.refresh(conversation)

    handoff = Handoff(
        conversation_id=conversation.id,
        reason="low_confidence",
        status="pending",
    )
    db_session.add(handoff)
    db_session.commit()
    db_session.refresh(handoff)
    return handoff


def test_company_lists_only_its_own_files(db_session):
    own_file = _seed_document(db_session, "tenant-a", "north.txt")
    _seed_document(db_session, "tenant-b", "south.txt")

    files = list_files(tenant_key="tenant-a", limit=500, offset=0, db=db_session)

    assert [item.id for item in files] == [own_file.id]


def test_company_cannot_delete_another_tenant_file(db_session):
    other_file = _seed_document(db_session, "tenant-b", "south.txt")

    with pytest.raises(HTTPException) as exc:
        delete_file(other_file.id, tenant_key="tenant-a", db=db_session)

    assert exc.value.status_code == 404
    assert db_session.get(Document, other_file.id) is not None


def test_company_lists_only_its_own_handoffs(db_session):
    own_handoff = _seed_handoff(db_session, "tenant-a")
    _seed_handoff(db_session, "tenant-b")

    handoffs = list_handoffs(
        tenant_key="tenant-a", channel=None, limit=500, offset=0, db=db_session
    )

    assert [item.id for item in handoffs] == [own_handoff.id]


def test_company_cannot_reply_to_another_tenant_handoff(db_session):
    other_handoff = _seed_handoff(db_session, "tenant-b")

    with pytest.raises(HTTPException) as exc:
        reply_handoff(
            other_handoff.id,
            ReplyRequest(content="Unauthorized reply"),
            tenant_key="tenant-a",
            db=db_session,
        )

    assert exc.value.status_code == 404


def test_company_cannot_resolve_another_tenant_handoff(db_session):
    other_handoff = _seed_handoff(db_session, "tenant-b")

    with pytest.raises(HTTPException) as exc:
        resolve_handoff(other_handoff.id, tenant_key="tenant-a", db=db_session)

    assert exc.value.status_code == 404
    db_session.refresh(other_handoff)
    assert other_handoff.status == "pending"
