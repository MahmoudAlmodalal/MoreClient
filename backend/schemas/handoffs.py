"""/api/handoffs — drives the /dashboard/handoffs queue."""

from pydantic import BaseModel


class HandoffMessageOut(BaseModel):
    id: str
    role: str       # user | assistant | agent
    content: str
    time: str


class HandoffOut(BaseModel):
    """Matches the frontend HandoffTicket shape."""

    id: int
    user: str
    channel: str
    reason: str     # low_confidence | user_requested | keyword_triggered | purchase_complete | complaint | support_request
    language: str
    timeAgo: str
    unreplied: bool
    messages: list[HandoffMessageOut]
    metadata: dict = {}


class ReplyRequest(BaseModel):
    content: str
