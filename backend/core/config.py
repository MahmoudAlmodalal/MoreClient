"""Centralized settings loaded from environment / Replit Secrets."""

import os

from dotenv import load_dotenv

load_dotenv()  # picks up a local .env in dev; no-op on Replit


def _csv(value: str | None, default: list[str]) -> list[str]:
    if not value:
        return default
    return [item.strip() for item in value.split(",") if item.strip()]


class Settings:
    # --- Persistence ---
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./backend.db")
    CHROMA_DIR: str = os.getenv("CHROMA_DIR", "./chroma_store")

    # --- Provider keys ---
    OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY")
    ANTHROPIC_API_KEY: str | None = os.getenv("ANTHROPIC_API_KEY")
    APP_SECRET: str | None = os.getenv("APP_SECRET")

    # --- AI models ---
    CHAT_MODEL: str = os.getenv("CHAT_MODEL", "gpt-4o")
    EMBED_MODEL: str = os.getenv("EMBED_MODEL", "text-embedding-3-small")
    EMBED_DIM: int = int(os.getenv("EMBED_DIM", "1536"))  # text-embedding-3-small

    # --- RAG behaviour ---
    # Default escalate cutoff; can be overridden per-tenant via Setting.confidence_threshold.
    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.45"))
    RETRIEVAL_K: int = int(os.getenv("RETRIEVAL_K", "4"))
    MEMORY_WINDOW: int = int(os.getenv("MEMORY_WINDOW", "8"))  # last N messages fed to the model

    # --- CORS ---
    ALLOWED_ORIGINS: list[str] = _csv(
        os.getenv("ALLOWED_ORIGINS"),
        ["http://localhost:5000", "http://127.0.0.1:5000"],
    )

    @property
    def has_openai(self) -> bool:
        return bool(self.OPENAI_API_KEY)


settings = Settings()
