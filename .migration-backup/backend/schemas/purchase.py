"""Purchase order API schemas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class PurchaseOrderOut(_CamelModel):
    id: int
    conversation_id: int
    customer_ref: str | None = None
    product_name: str | None = None
    quantity: int | None = None
    delivery_address: str | None = None
    status: str
    state: str
    order_data: dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime


class PurchaseStatusUpdate(_CamelModel):
    status: str
