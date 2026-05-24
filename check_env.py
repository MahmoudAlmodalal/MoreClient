"""Verify required env vars / Replit Secrets are set (task 0.2)."""

import os

from dotenv import load_dotenv

load_dotenv()  # read keys from a local .env in dev (no-op if absent)

# At least one chat-capable LLM key is required (any of these satisfies it).
LLM_KEYS = ["GEMINI_API_KEY", "NVIDIA_API_KEY", "OPENAI_API_KEY"]
REQUIRED = ["APP_SECRET"]
OPTIONAL = ["ANTHROPIC_API_KEY", "DATABASE_URL"]

missing = [k for k in REQUIRED if not os.getenv(k)]
has_llm = any(os.getenv(k) for k in LLM_KEYS)
if not has_llm:
    missing.append(f"one of {LLM_KEYS}")

print("LLM key  :", {k: ("set" if os.getenv(k) else "unset") for k in LLM_KEYS},
      "->", "OK" if has_llm else "MISSING")
print("Required :", {k: ("set" if os.getenv(k) else "MISSING") for k in REQUIRED})
print("Optional :", {k: ("set" if os.getenv(k) else "unset") for k in OPTIONAL})
print("MISSING  :", missing or "none — OK")

assert not missing, f"Missing required env vars: {missing}"
