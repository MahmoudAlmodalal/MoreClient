"""GET /api/analytics — drives the /dashboard KPIs, charts, and unanswered queue."""

from pydantic import BaseModel


class Kpis(BaseModel):
    total_questions: int = 0
    deflection_rate: float = 0.0   # 0..1
    cost_savings: float = 0.0      # USD
    feedback_score: float = 0.0    # 0..5


class TopQuestion(BaseModel):
    name: str
    count: int


class ChannelSlice(BaseModel):
    name: str
    value: int


class UnansweredItem(BaseModel):
    id: int
    question: str
    channel: str
    language: str
    confidence: float
    timeAgo: str


class AnalyticsResponse(BaseModel):
    kpis: Kpis
    top_questions: list[TopQuestion]
    channel_distribution: list[ChannelSlice]
    unanswered: list[UnansweredItem]
