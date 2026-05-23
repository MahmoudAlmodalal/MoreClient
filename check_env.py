"""Verify required env vars / Replit Secrets are set (task 0.2)."""

import os

REQUIRED = ["OPENAI_API_KEY", "APP_SECRET"]
OPTIONAL = ["ANTHROPIC_API_KEY", "DATABASE_URL"]

missing = [k for k in REQUIRED if not os.getenv(k)]

print("Required :", {k: ("set" if os.getenv(k) else "MISSING") for k in REQUIRED})
print("Optional :", {k: ("set" if os.getenv(k) else "unset") for k in OPTIONAL})
print("MISSING  :", missing or "none — OK")

assert not missing, f"Missing required env vars: {missing}"
