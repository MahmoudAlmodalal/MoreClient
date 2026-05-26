from datetime import datetime
from sqlalchemy import (
    BigInteger, Boolean, Float, ForeignKey, Integer, String, Text,
    DateTime, func, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from app.database import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    plan: Mapped[str] = mapped_column(String(32), default="pro", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    used_messages: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    limit_messages: Mapped[int] = mapped_column(Integer, default=500, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    auth_users: Mapped[list["AuthUser"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    settings: Mapped["Settings"] = relationship(back_populates="tenant", cascade="all, delete-orphan", uselist=False)
    conversations: Mapped[list["Conversation"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    documents: Mapped[list["Document"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    handoffs: Mapped[list["Handoff"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")


class AuthUser(Base):
    __tablename__ = "auth_users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str | None] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), default="company", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    tenant: Mapped["Tenant"] = relationship(back_populates="auth_users")


class Settings(Base):
    __tablename__ = "settings"

    tenant_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("tenants.id", ondelete="CASCADE"), primary_key=True)
    company_name: Mapped[str | None] = mapped_column(String(255))
    bot_name: Mapped[str | None] = mapped_column(String(255))
    company_logo: Mapped[str | None] = mapped_column(Text)
    bot_tone: Mapped[str | None] = mapped_column(String(64))
    system_prompt_extra: Mapped[str | None] = mapped_column(Text)

    telegram_token: Mapped[str | None] = mapped_column(String(255))
    is_telegram_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    telegram_webhook_secret: Mapped[str | None] = mapped_column(String(255))
    telegram_last_delivery_status: Mapped[str | None] = mapped_column(String(32))
    telegram_last_delivery_detail: Mapped[str | None] = mapped_column(Text)
    telegram_last_delivery_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    twilio_sid: Mapped[str | None] = mapped_column(String(255))
    twilio_token: Mapped[str | None] = mapped_column(String(255))
    twilio_number: Mapped[str | None] = mapped_column(String(64))
    is_whatsapp_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    subscription_plan: Mapped[str | None] = mapped_column(String(64))
    confidence_threshold: Mapped[float] = mapped_column(Float, default=0.35, nullable=False)
    purchase_flow_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    purchase_collect_address: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    purchase_collect_quantity: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    purchase_auto_forward_to_support: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    purchase_confirmation_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    purchase_session_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    purchase_currency_label: Mapped[str | None] = mapped_column(String(16))
    intent_llm_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    intent_confidence_threshold: Mapped[float] = mapped_column(Float, default=0.6, nullable=False)
    auto_handoff_on_complaint: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    tenant: Mapped["Tenant"] = relationship(back_populates="settings")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="indexed", nullable=False)
    source: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    tenant: Mapped["Tenant"] = relationship(back_populates="documents")
    chunks: Mapped[list["DocumentChunk"]] = relationship(back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    document_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1536))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    document: Mapped["Document"] = relationship(back_populates="chunks")

    __table_args__ = (
        Index("idx_chunks_tenant_id", "tenant_id"),
        Index("idx_chunks_document_id", "document_id"),
    )


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    customer_ref: Mapped[str] = mapped_column(String(255), nullable=False)
    channel: Mapped[str] = mapped_column(String(32), default="web", nullable=False)
    language: Mapped[str] = mapped_column(String(8), default="en", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    tenant: Mapped["Tenant"] = relationship(back_populates="conversations")
    messages: Mapped[list["Message"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")
    handoffs: Mapped[list["Handoff"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")


class Handoff(Base):
    __tablename__ = "handoffs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    conversation_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    channel: Mapped[str] = mapped_column(String(32), nullable=False)
    reason: Mapped[str | None] = mapped_column(String(64))
    question: Mapped[str | None] = mapped_column(Text)
    language: Mapped[str] = mapped_column(String(8), default="en", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    unreplied: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    delivery_status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    delivery_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    delivery_detail: Mapped[str | None] = mapped_column(Text)
    csat_score: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    tenant: Mapped["Tenant"] = relationship(back_populates="handoffs")
    conversation: Mapped["Conversation"] = relationship(back_populates="handoffs")


class LearnedAnswer(Base):
    __tablename__ = "learned_answers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    source_handoff_id: Mapped[int | None] = mapped_column(BigInteger)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
