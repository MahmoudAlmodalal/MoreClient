from datetime import datetime
from typing import Any
from pydantic import BaseModel, EmailStr


# --- Auth ---

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None
    company_name: str = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str
    user_id: int
    email: str
    name: str | None
    role: str
    redirect_to: str
    tenant_key: str


class MeResponse(BaseModel):
    user_id: int
    email: str
    name: str | None
    role: str
    tenant_key: str


class RefreshResponse(BaseModel):
    token: str


# --- Settings ---

class SettingsOut(BaseModel):
    tenant_key: str
    company_name: str | None
    bot_name: str | None
    company_logo: str | None
    bot_tone: str | None
    system_prompt_extra: str | None
    telegram_token: str | None
    is_telegram_active: bool
    twilio_sid: str | None
    twilio_token: str | None
    twilio_number: str | None
    is_whatsapp_active: bool
    subscription_plan: str | None
    confidence_threshold: float
    purchase_flow_enabled: bool
    purchase_collect_address: bool
    purchase_collect_quantity: bool
    purchase_auto_forward_to_support: bool
    purchase_confirmation_required: bool
    purchase_session_minutes: int
    purchase_currency_label: str | None
    intent_llm_enabled: bool
    intent_confidence_threshold: float
    auto_handoff_on_complaint: bool
    used_messages: int = 0


class SettingsPatchRequest(BaseModel):
    company_name: str | None = None
    bot_name: str | None = None
    company_logo: str | None = None
    bot_tone: str | None = None
    system_prompt_extra: str | None = None
    telegram_token: str | None = None
    is_telegram_active: bool | None = None
    twilio_sid: str | None = None
    twilio_token: str | None = None
    twilio_number: str | None = None
    is_whatsapp_active: bool | None = None
    subscription_plan: str | None = None
    confidence_threshold: float | None = None
    purchase_flow_enabled: bool | None = None
    purchase_collect_address: bool | None = None
    purchase_collect_quantity: bool | None = None
    purchase_auto_forward_to_support: bool | None = None
    purchase_confirmation_required: bool | None = None
    purchase_session_minutes: int | None = None
    purchase_currency_label: str | None = None
    intent_llm_enabled: bool | None = None
    intent_confidence_threshold: float | None = None
    auto_handoff_on_complaint: bool | None = None


# --- Files ---

class FileOut(BaseModel):
    id: int
    tenant_key: str
    name: str
    size: str
    type: str
    chunks: int
    date: str
    status: str


# --- Chat ---

class ChatRequest(BaseModel):
    session_id: str
    message: str
    channel: str = "web"
    tenant_key: str | None = None
    tenantKey: str | None = None

    def get_tenant_key(self) -> str:
        return self.tenant_key or self.tenantKey or ""


class ChatResponse(BaseModel):
    answer: str
    confidence: float
    handoff: dict | None
    reply: str
    language: str
    escalate: bool
    sender: str
    used_llm: bool
    fallback: str | None


class AgentMessageOut(BaseModel):
    id: int
    role: str
    content: str
    time: str


# --- Handoffs ---

class HandoffMessageOut(BaseModel):
    id: int
    role: str
    content: str
    time: str


class DeliveryInfo(BaseModel):
    status: str
    attempts: int
    detail: str | None
    ok: bool


class HandoffOut(BaseModel):
    id: int
    tenant_id: int
    conversation_id: int
    channel: str
    reason: str | None
    question: str | None
    language: str
    status: str
    unreplied: bool
    csat_score: int | None
    created_at: str
    time_ago: str
    messages: list[HandoffMessageOut]
    customer_ref: str
    delivery: DeliveryInfo


class ReplyRequest(BaseModel):
    message: str | None = None
    content: str | None = None

    def get_content(self) -> str:
        return self.message or self.content or ""


class ResolveResponse(BaseModel):
    ok: bool


class FeedbackRequest(BaseModel):
    score: int


class BulkDeleteRequest(BaseModel):
    ids: list[int]


class BulkDeleteResponse(BaseModel):
    deleted: int


# --- Learn ---

class LearnRequest(BaseModel):
    question: str
    answer: str
    source_handoff_id: int | None = None


class LearnResponse(BaseModel):
    ok: bool
    id: int
    document_id: int


# --- Analytics ---

class KPIs(BaseModel):
    total_questions: int
    deflection_rate: float
    cost_savings: float
    feedback_score: float


class TopQuestion(BaseModel):
    name: str
    count: int


class ChannelDist(BaseModel):
    name: str
    value: int


class UnansweredItem(BaseModel):
    id: int
    question: str
    channel: str
    language: str
    confidence: float
    time_ago: str


class AnalyticsResponse(BaseModel):
    kpis: KPIs
    top_questions: list[TopQuestion]
    channel_distribution: list[ChannelDist]
    unanswered: list[UnansweredItem]


# --- Admin ---

class TenantOut(BaseModel):
    id: int
    tenant_key: str
    name: str
    email: str
    plan: str
    status: str
    used_messages: int
    limit_messages: int
    created_date: str


class CreateTenantRequest(BaseModel):
    name: str
    email: EmailStr
    plan: str = "pro"
    limit_messages: int = 500
    tenant_key: str | None = None


class UpdateTenantRequest(BaseModel):
    name: str | None = None
    email: str | None = None
    plan: str | None = None
    limit_messages: int | None = None


class AdminKPIs(BaseModel):
    active_tenants: int
    total_tenants: int
    total_mrr: int
    global_messages: int


class AdminHealth(BaseModel):
    db_latency_ms: float
    chroma_status: str
    memory_usage_percent: float
    cpu_usage_percent: float
    llm_provider_status: str


# --- Health ---

class HealthResponse(BaseModel):
    status: str
