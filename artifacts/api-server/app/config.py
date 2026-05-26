import os
import secrets
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    port: int = 8080
    node_env: str = "development"
    log_level: str = "info"

    jwt_secret: str = ""
    jwt_ttl_seconds: int = 86400
    admin_api_key: str = ""

    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    gemini_api_key: str = ""
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta"
    llm_provider: str = "auto"
    local_llm_enabled: bool = False
    local_llm_url: str = "http://localhost:11434/v1"
    local_llm_model: str = "aya"

    public_api_url: str = ""
    embed_dim: int = 1536
    allow_insecure_admin: str = ""

    def model_post_init(self, __context):
        is_prod = self.node_env == "production"
        if not self.jwt_secret:
            if is_prod:
                raise ValueError("JWT_SECRET is required in production")
            object.__setattr__(self, "jwt_secret", secrets.token_hex(32))
        if not self.admin_api_key:
            if is_prod:
                raise ValueError("ADMIN_API_KEY is required in production")
            object.__setattr__(self, "admin_api_key", secrets.token_hex(16))

    def has_llm(self) -> bool:
        return bool(self.openai_api_key or self.gemini_api_key or self.local_llm_enabled)

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
