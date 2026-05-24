"""Verify required env vars / Replit Secrets before the server boots.

Environment-aware:
  * ENV=dev (default) — keyless demo: report status but never hard-fail, so the
    app boots with zero secrets (hash embeddings + extractive fallback).
  * ENV != dev (prod/staging) — fail fast on missing critical secrets so a
    misconfigured deployment never starts serving.
"""

import os
import sys

from dotenv import load_dotenv

load_dotenv()  # read keys from a local .env in dev (no-op if absent)

ENV = os.getenv("ENV", "dev").strip().lower()
IS_DEV = ENV == "dev"

# At least one chat-capable LLM key is required (any of these satisfies it).
LLM_KEYS = ["GEMINI_API_KEY", "MISTRAL_API_KEY", "NVIDIA_API_KEY", "OPENAI_API_KEY"]
# Critical in non-dev environments.
PROD_REQUIRED = ["APP_SECRET", "ADMIN_API_KEY"]
OPTIONAL = ["ANTHROPIC_API_KEY", "DATABASE_URL"]

has_llm = any(os.getenv(k) for k in LLM_KEYS)

print(f"ENV      : {ENV}{' (keyless demo OK)' if IS_DEV else ' (strict)'}")
print("LLM key  :", {k: ("set" if os.getenv(k) else "unset") for k in LLM_KEYS},
      "->", "OK" if has_llm else "unset (keyless fallback)")
print("Critical :", {k: ("set" if os.getenv(k) else "MISSING") for k in PROD_REQUIRED})
print("Optional :", {k: ("set" if os.getenv(k) else "unset") for k in OPTIONAL})

if IS_DEV:
    print("MISSING  : none enforced in dev — OK")
    sys.exit(0)

missing = [k for k in PROD_REQUIRED if not os.getenv(k)]
if not has_llm:
    missing.append(f"one of {LLM_KEYS}")

print("MISSING  :", missing or "none — OK")
if missing:
    print(f"\nERROR: missing required env in ENV={ENV}: {missing}", file=sys.stderr)
    sys.exit(1)
