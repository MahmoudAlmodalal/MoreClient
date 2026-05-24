"""ORM table schemas (task 0.6).

Product flow: knowledge base (documents) -> conversations -> messages,
with human handoffs and learned answers feeding back into the KB.

DEV NOTE: init_db() uses Base.metadata.create_all, which is additive-only --
it creates missing *tables* but never ALTERs columns on a table that already
exists. After changing any column below, delete the SQLite file (backend.db)
once so the schema is recreated fresh. There is no migration tool yet.
"""

import re
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    inspect,
    text,
)
from sqlalchemy.orm import Session, relationship

from backend.models.database import Base
from backend.core.config import settings as cfg


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)          # = filename
    tenant_key = Column(String(255), default=cfg.DEFAULT_TENANT_KEY, nullable=False, index=True)
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
    tenant_key = Column(String(255), default=cfg.DEFAULT_TENANT_KEY, nullable=False, index=True)
    customer_ref = Column(String(255), nullable=True)
    status = Column(String(20), default="open", nullable=False)  # open|closed|handoff
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    handoffs = relationship("Handoff", back_populates="conversation", cascade="all, delete-orphan")
    purchase_orders = relationship("PurchaseOrder", back_populates="conversation", cascade="all, delete-orphan")


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


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False, index=True)
    customer_ref = Column(String(255), nullable=True, index=True)
    product_name = Column(Text, nullable=True)
    quantity = Column(Integer, nullable=True)
    delivery_address = Column(Text, nullable=True)
    status = Column(String(20), default="pending", nullable=False, index=True)
    state = Column(String(40), default="collecting_product", nullable=False, index=True)
    order_data = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    conversation = relationship("Conversation", back_populates="purchase_orders")


class LearnedAnswer(Base):
    __tablename__ = "learned_answers"

    id = Column(Integer, primary_key=True, index=True)
    tenant_key = Column(String(255), default=cfg.DEFAULT_TENANT_KEY, nullable=False, index=True)
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

    purchase_flow_enabled = Column(Boolean, default=True, nullable=False)
    purchase_collect_address = Column(Boolean, default=True, nullable=False)
    purchase_collect_quantity = Column(Boolean, default=True, nullable=False)
    purchase_auto_forward_to_support = Column(Boolean, default=True, nullable=False)
    purchase_confirmation_required = Column(Boolean, default=True, nullable=False)
    purchase_session_minutes = Column(Integer, default=30, nullable=False)
    purchase_currency_label = Column(String(20), default="ريال", nullable=False)
    intent_llm_enabled = Column(Boolean, default=True, nullable=False)
    intent_confidence_threshold = Column(Float, default=0.70, nullable=False)
    auto_handoff_on_complaint = Column(Boolean, default=True, nullable=False)


class Tenant(Base):
    """Admin-managed subscription registry. Each row represents a business
    tenant with its subscription plan, usage tracking, and activation status.
    Independent from the single-row Setting config (future: each tenant will
    own its own Setting row)."""

    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    tenant_key = Column(String(255), nullable=False, unique=True, index=True)
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


def upgrade_existing_schema(engine) -> None:
    """Add columns introduced after initial create_all() for existing DB files."""
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    if "settings" not in tables:
        return

    dialect = engine.dialect.name

    # Defense-in-depth: these column names/types are hardcoded above, but guard the
    # interpolation so a future maintainer can't smuggle a user-derived identifier into
    # the ALTER TABLE DDL (SQLAlchemy can't bind identifiers, only values).
    _ident_re = re.compile(r"^[a-z_][a-z0-9_]*$")
    _allowed_types = {"BOOLEAN", "INTEGER", "FLOAT", "VARCHAR(20)"}

    def sql_default(value):
        if isinstance(value, bool):
            if dialect == "postgresql":
                return "TRUE" if value else "FALSE"
            return "1" if value else "0"
        if isinstance(value, (int, float)):
            return str(value)
        escaped = str(value).replace("'", "''")
        return f"'{escaped}'"

    with engine.begin() as conn:
        settings_columns = {col["name"] for col in inspector.get_columns("settings")}
        settings_additions = {
            "purchase_flow_enabled": ("BOOLEAN", True),
            "purchase_collect_address": ("BOOLEAN", True),
            "purchase_collect_quantity": ("BOOLEAN", True),
            "purchase_auto_forward_to_support": ("BOOLEAN", True),
            "purchase_confirmation_required": ("BOOLEAN", True),
            "purchase_session_minutes": ("INTEGER", 30),
            "purchase_currency_label": ("VARCHAR(20)", "ريال"),
            "intent_llm_enabled": ("BOOLEAN", True),
            "intent_confidence_threshold": ("FLOAT", 0.70),
            "auto_handoff_on_complaint": ("BOOLEAN", True),
        }
        for name, (sql_type, default) in settings_additions.items():
            if name in settings_columns:
                continue
            if not _ident_re.match(name) or sql_type not in _allowed_types:
                raise ValueError(f"unsafe schema upgrade column: {name!r} {sql_type!r}")
            ddl = (
                f"ALTER TABLE settings ADD COLUMN {name} {sql_type} "
                f"DEFAULT {sql_default(default)} NOT NULL"
            )
            conn.execute(text(ddl))

        table_additions = {
            "documents": {
                "tenant_key": ("VARCHAR(255)", cfg.DEFAULT_TENANT_KEY),
            },
            "conversations": {
                "tenant_key": ("VARCHAR(255)", cfg.DEFAULT_TENANT_KEY),
            },
            "learned_answers": {
                "tenant_key": ("VARCHAR(255)", cfg.DEFAULT_TENANT_KEY),
            },
        }
        for table_name, additions in table_additions.items():
            if table_name not in tables:
                continue
            columns = {col["name"] for col in inspector.get_columns(table_name)}
            for name, (sql_type, default) in additions.items():
                if name in columns:
                    continue
                ddl = (
                    f"ALTER TABLE {table_name} ADD COLUMN {name} {sql_type} "
                    f"DEFAULT {sql_default(default)} NOT NULL"
                )
                conn.execute(text(ddl))

        if "tenants" in tables:
            tenant_columns = {col["name"] for col in inspector.get_columns("tenants")}
            if "tenant_key" not in tenant_columns:
                conn.execute(text("ALTER TABLE tenants ADD COLUMN tenant_key VARCHAR(255)"))
                tenant_rows = conn.execute(text("SELECT id FROM tenants ORDER BY id ASC")).mappings().all()
                for row in tenant_rows:
                    conn.execute(
                        text("UPDATE tenants SET tenant_key = :tenant_key WHERE id = :id"),
                        {"tenant_key": f"tenant-{row['id']}", "id": row["id"]},
                    )
            try:
                conn.execute(
                    text("CREATE UNIQUE INDEX IF NOT EXISTS ix_tenants_tenant_key ON tenants (tenant_key)")
                )
            except Exception:
                # Some development databases may already have duplicate manual keys.
                # Keep the app bootable; create/update paths still enforce uniqueness.
                pass
