"""POST /api/chat — drives the /widget chat and both channel webhooks."""

from typing import Literal

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    session_id: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    channel: str = "web"  # web | telegram | whatsapp


class ChatResponse(BaseModel):
    reply: str
    sender: Literal["bot", "human"] = "bot"
    escalate: bool = False
    confidence: float = 0.0
    language: Literal["en", "ar"] = "en"
