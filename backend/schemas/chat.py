"""POST /api/chat — drives the /widget chat and both channel webhooks."""

from typing import Literal

from pydantic import AliasChoices, BaseModel, Field


class ChatRequest(BaseModel):
    session_id: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    channel: str = "web"  # web | telegram | whatsapp
    tenant_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("tenant_key", "tenantKey"),
    )


class ChatResponse(BaseModel):
    reply: str
    sender: Literal["bot", "human"] = "bot"
    escalate: bool = False
    confidence: float = 0.0
    language: Literal["en", "ar"] = "en"
