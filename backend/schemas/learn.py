"""POST /api/learn — "Teach Bot" + approved handoff answers feeding the KB."""

from pydantic import BaseModel, Field


class LearnRequest(BaseModel):
    question: str = Field(..., min_length=1)
    answer: str = Field(..., min_length=1)
    source_handoff_id: int | None = None
    tenant_key: str | None = None


class LearnResponse(BaseModel):
    id: int
    status: str = "learned"
