"""ORM table schemas (task 0.6).

Product flow: knowledge base (documents) -> conversations -> messages,
with human handoffs and learned answers feeding back into the KB.

DEV NOTE: init_db() uses Base.metadata.create_all, which is additive-only --
it creates missing *tables* but never ALTERs columns on a table that already
exists. After changing any column below, delete the SQLite file (backend.db)
once so the schema is recreated fresh. There is no migration tool yet.
"""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Session, relationship

from backend.models.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)          # = filename
    content = Column(Text, nullable=False)               # extracted text
    source = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)           # bytes; frontend formats to "2.4 MB"
    file_type = Column(String(20), nullable=True)        # pdf | docx | txt
    chunk_count = Column(Integer, default=0, nullable=False)
    status = Column(String(20), default="processing", nullable=False)  # processing|completed|failed
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    channel = Column(String(50), nullable=False)          # web | whatsapp | telegram
    customer_ref = Column(String(255), nullable=True)
    status = Column(String(20), default="open", nullable=False)  # open|closed|handoff
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    handoffs = relationship("Handoff", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)             # user | assistant | agent
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    conversation = relationship("Conversation", back_populates="messages")


class Handoff(Base):
    __tablename__ = "handoffs"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False, index=True)
    reason = Column(Text, nullable=True)  # low_confidence | user_requested | keyword_triggered
    status = Column(String(20), default="pending", nullable=False)  # pending | resolved
    assigned_to = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    conversation = relationship("Conversation", back_populates="handoffs")


class LearnedAnswer(Base):
    __tablename__ = "learned_answers"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    source_handoff_id = Column(Integer, ForeignKey("handoffs.id"), nullable=True)
    usage_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AuthUser(Base):
    __tablename__ = "auth_users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=True)
    password_hash = Column(Text, nullable=True)
    provider = Column(String(20), default="password", nullable=False)
    provider_subject = Column(String(255), nullable=True, index=True)
    role = Column(String(20), default="user", nullable=False)  # user | admin
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_login_at = Column(DateTime, nullable=True)


class Setting(Base):
    """Single-row tenant/bot config (id is always 1). Mirrors the fields that
    live in the frontend's language-provider context."""

    __tablename__ = "settings"

    id = Column(Integer, primary_key=True)  # always 1

    company_name = Column(String(255), default="clientMORE", nullable=False)
    bot_name = Column(String(255), default="clientMORE", nullable=False)
    company_logo = Column(Text, default="/clientmore-logo.jpeg", nullable=False)  # URL or base64 data URI

    bot_tone = Column(String(20), default="professional", nullable=False)  # friendly|professional|formal
    system_prompt_extra = Column(Text, default="", nullable=False)

    telegram_token = Column(String(255), nullable=True)
    is_telegram_active = Column(Boolean, default=False, nullable=False)

    twilio_sid = Column(String(255), nullable=True)
    twilio_token = Column(String(255), nullable=True)
    twilio_number = Column(String(50), nullable=True)
    is_whatsapp_active = Column(Boolean, default=False, nullable=False)

    subscription_plan = Column(String(20), default="pro", nullable=False)  # pro | ultra
    used_messages = Column(Integer, default=0, nullable=False)

    confidence_threshold = Column(Float, default=0.45, nullable=False)


class Tenant(Base):
    """Admin-managed subscription registry. Each row represents a business
    tenant with its subscription plan, usage tracking, and activation status.
    Independent from the single-row Setting config (future: each tenant will
    own its own Setting row)."""

    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    plan = Column(String(20), default="pro", nullable=False)         # pro | ultra | custom
    status = Column(String(20), default="active", nullable=False)    # active | inactive
    used_messages = Column(Integer, default=0, nullable=False)
    limit_messages = Column(Integer, default=500, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


def get_or_create_settings(db: Session) -> "Setting":
    """Return the single config row, lazily creating it with defaults."""
    row = db.get(Setting, 1)
    if row is None:
        row = Setting(id=1)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row
