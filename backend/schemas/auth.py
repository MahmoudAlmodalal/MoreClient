"""Auth request/response schemas.

The frontend speaks camelCase while the backend keeps snake_case names.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class LoginIn(_CamelModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)


class SignUpIn(_CamelModel):
    name: str = Field(..., min_length=2)
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)


class SocialAuthStartIn(_CamelModel):
    provider: Literal["google", "apple"]
    mode: Literal["login", "signup"] = "login"


class SocialAuthStartOut(_CamelModel):
    provider: Literal["google", "apple"]
    auth_url: str


class AuthSessionOut(_CamelModel):
    token: str
    user_id: int
    email: str
    name: str | None = None
    role: Literal["admin", "company"]
    redirect_to: str
    tenant_key: str | None = None


class RegisterIn(SignUpIn):
    company_name: str = Field(..., min_length=2)


class TokenPayload(BaseModel):
    sub: str
    email: str
    role: Literal["admin", "company"]
    tenant_key: str | None = None
    iat: int
    exp: int
