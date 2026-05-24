"""POST /api/learn — "Teach Bot" + approved handoff answers feeding the KB."""

from pydantic import BaseModel, Field


class LearnRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    answer: str = Field(..., min_length=1, max_length=4000)
    source_handoff_id: int | None = Field(default=None, ge=1)
    tenant_key: str | None = None


class LearnResponse(BaseModel):
    id: int
    status: str = "learned"
