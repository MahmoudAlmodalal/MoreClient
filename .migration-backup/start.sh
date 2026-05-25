#!/usr/bin/env bash
set -e

# Validate environment before serving. In ENV=dev this is non-fatal (keyless
# demo); in any other ENV it aborts the boot on missing critical secrets.
python check_env.py

# Frontend: the real app is the Next.js project in MoreClient/ on :5000.
( cd MoreClient && pnpm install && pnpm dev ) &

# Backend (FastAPI) on :8000, foreground. Disable --reload outside dev.
RELOAD_FLAG="--reload"
if [ "${ENV:-dev}" != "dev" ]; then
  RELOAD_FLAG=""
fi
uvicorn backend.main:app --host 0.0.0.0 --port 8000 $RELOAD_FLAG
