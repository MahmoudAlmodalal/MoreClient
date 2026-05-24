"""Centralized settings loaded from environment / Replit Secrets."""

import os

from dotenv import load_dotenv

load_dotenv()  # picks up a local .env in dev; no-op on Replit


def _csv(value: str | None, default: list[str]) -> list[str]:
    if not value:
        return default
    return [item.strip() for item in value.split(",") if item.strip()]


def _clamp_float(value: str | None, default: float, lo: float, hi: float) -> float:
    try:
        result = float(value) if value is not None else default
    except (TypeError, ValueError):
        result = default
    return min(max(result, lo), hi)


def _clamp_int(value: str | None, default: int, lo: int, hi: int) -> int:
    try:
        result = int(value) if value is not None else default
    except (TypeError, ValueError):
        result = default
    return min(max(result, lo), hi)


class Settings:
    # --- Persistence ---
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./backend.db")
    CHROMA_DIR: str = os.getenv("CHROMA_DIR", "./chroma_store")

    # --- Provider keys ---
    OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY")
    NVIDIA_API_KEY: str | None = os.getenv("NVIDIA_API_KEY")
    GEMINI_API_KEY: str | None = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    ANTHROPIC_API_KEY: str | None = os.getenv("ANTHROPIC_API_KEY")
    APP_SECRET: str | None = os.getenv("APP_SECRET")
    # Optional Telegram webhook secret token (set on setWebhook); when set, inbound
    # updates whose X-Telegram-Bot-Api-Secret-Token header mismatches are dropped.
    TELEGRAM_WEBHOOK_SECRET: str | None = os.getenv("TELEGRAM_WEBHOOK_SECRET")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5000").rstrip("/")
    BACKEND_PUBLIC_URL: str = os.getenv("BACKEND_PUBLIC_URL", "http://localhost:8000").rstrip("/")
    GOOGLE_CLIENT_ID: str | None = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: str | None = os.getenv("GOOGLE_CLIENT_SECRET")
    APPLE_CLIENT_ID: str | None = os.getenv("APPLE_CLIENT_ID")
    APPLE_CLIENT_SECRET: str | None = os.getenv("APPLE_CLIENT_SECRET")

    # --- AI models ---
    CHAT_MODEL: str = os.getenv("CHAT_MODEL", "gpt-4o")
    EMBED_MODEL: str = os.getenv("EMBED_MODEL", "text-embedding-3-small")
    EMBED_DIM: int = int(os.getenv("EMBED_DIM", "1536"))  # text-embedding-3-small / hash fallback

    # --- Provider routing (OpenAI-compatible endpoints; no extra SDK needed) ---
    # auto = try Gemini, then DeepSeek (NVIDIA), then OpenAI — whichever keys exist.
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "auto")  # auto | gemini | deepseek | openai

    # Gemini via its OpenAI-compatible endpoint.
    GEMINI_BASE_URL: str = os.getenv(
        "GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/"
    )
    GEMINI_CHAT_MODEL: str = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-flash")
    GEMINI_EMBED_MODEL: str = os.getenv("GEMINI_EMBED_MODEL", "gemini-embedding-001")  # 3072-dim

    # DeepSeek via NVIDIA's OpenAI-compatible endpoint.
    NVIDIA_BASE_URL: str = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
    # v4-flash answers in ~5s; v4-pro is far slower and routinely exceeds 90s, so flash
    # is the practical fallback default. Override with DEEPSEEK_MODEL=deepseek-ai/deepseek-v4-pro.
    DEEPSEEK_MODEL: str = os.getenv("DEEPSEEK_MODEL", "deepseek-ai/deepseek-v4-flash")

    # --- RAG behaviour ---
    # Default escalate cutoff; can be overridden per-tenant via Setting.confidence_threshold.
    CONFIDENCE_THRESHOLD: float = _clamp_float(os.getenv("CONFIDENCE_THRESHOLD"), 0.45, 0.0, 1.0)
    RETRIEVAL_K: int = _clamp_int(os.getenv("RETRIEVAL_K"), 4, 1, 20)
    MEMORY_WINDOW: int = _clamp_int(  # last N messages fed to the model
        os.getenv("MEMORY_WINDOW"), 8, 1, 10_000
    )

    # --- CORS ---
    ALLOWED_ORIGINS: list[str] = _csv(
        os.getenv("ALLOWED_ORIGINS"),
        ["http://localhost:5000", "http://127.0.0.1:5000"],
    )

    @property
    def has_any_llm(self) -> bool:
        """Any chat-capable provider key is present (else we use extractive fallback)."""
        return bool(self.GEMINI_API_KEY or self.NVIDIA_API_KEY or self.OPENAI_API_KEY)

    # Back-compat alias: older callers (e.g. admin health) read `has_openai`.
    @property
    def has_openai(self) -> bool:
        return self.has_any_llm

    @property
    def embed_provider(self) -> str:
        """Which provider supplies embeddings. Gemini preferred; hash is the keyless fallback.

        NVIDIA/DeepSeek has no simple OpenAI-compatible embeddings endpoint, so a
        DeepSeek-only setup still uses hash embeddings (and never tries OpenAI with a
        missing key).
        """
        if self.GEMINI_API_KEY:
            return "gemini"
        if self.OPENAI_API_KEY:
            return "openai"
        return "hash"

    def chat_provider_chain(self) -> list[str]:
        """Ordered list of chat providers to try. `auto` falls back across all keys set."""
        if self.LLM_PROVIDER in ("gemini", "deepseek", "openai"):
            return [self.LLM_PROVIDER]
        available = {
            "gemini": bool(self.GEMINI_API_KEY),
            "deepseek": bool(self.NVIDIA_API_KEY),
            "openai": bool(self.OPENAI_API_KEY),
        }
        return [p for p in ("gemini", "deepseek", "openai") if available[p]]


settings = Settings()
