"""GET/PUT /api/settings — tenant/bot config.

The frontend speaks camelCase (companyName, botName, ...). We expose camelCase
aliases while keeping snake_case attribute names that map 1:1 to the Setting
ORM columns. populate_by_name lets the API accept either form.
"""

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class SettingsOut(_CamelModel):
    company_name: str
    bot_name: str
    company_logo: str
    bot_tone: str
    system_prompt_extra: str
    telegram_token: str | None = None
    is_telegram_active: bool = False
    twilio_sid: str | None = None
    twilio_token: str | None = None
    twilio_number: str | None = None
    is_whatsapp_active: bool = False
    subscription_plan: str
    used_messages: int
    confidence_threshold: float
    purchase_flow_enabled: bool
    purchase_collect_address: bool
    purchase_collect_quantity: bool
    purchase_auto_forward_to_support: bool
    purchase_confirmation_required: bool
    purchase_session_minutes: int
    purchase_currency_label: str
    intent_llm_enabled: bool
    intent_confidence_threshold: float
    auto_handoff_on_complaint: bool


class SettingsUpdate(_CamelModel):
    """All fields optional — PUT performs a partial update."""

    company_name: str | None = Field(default=None, max_length=255)
    bot_name: str | None = Field(default=None, max_length=255)
    company_logo: str | None = Field(default=None, max_length=200_000)  # URL or base64 data URI
    bot_tone: str | None = None
    system_prompt_extra: str | None = Field(default=None, max_length=8000)
    telegram_token: str | None = Field(default=None, max_length=255)
    is_telegram_active: bool | None = None
    twilio_sid: str | None = Field(default=None, max_length=255)
    twilio_token: str | None = Field(default=None, max_length=255)
    twilio_number: str | None = Field(default=None, max_length=50)
    is_whatsapp_active: bool | None = None
    subscription_plan: str | None = None
    used_messages: int | None = None
    confidence_threshold: float | None = Field(default=None, ge=0, le=1)
    purchase_flow_enabled: bool | None = None
    purchase_collect_address: bool | None = None
    purchase_collect_quantity: bool | None = None
    purchase_auto_forward_to_support: bool | None = None
    purchase_confirmation_required: bool | None = None
    purchase_session_minutes: int | None = None
    purchase_currency_label: str | None = None
    intent_llm_enabled: bool | None = None
    intent_confidence_threshold: float | None = Field(default=None, ge=0, le=1)
    auto_handoff_on_complaint: bool | None = None

    @field_validator("subscription_plan")
    @classmethod
    def _check_plan(cls, v: str | None) -> str | None:
        if v is not None and v not in {"pro", "ultra"}:
            raise ValueError("subscription_plan must be one of: pro, ultra")
        return v

    @field_validator("bot_tone")
    @classmethod
    def _check_tone(cls, v: str | None) -> str | None:
        if v is not None and v not in {"friendly", "professional", "formal"}:
            raise ValueError("bot_tone must be one of: friendly, professional, formal")
        return v
