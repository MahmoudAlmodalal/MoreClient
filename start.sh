#!/usr/bin/env bash
set -e

# Frontend: the real app is the Next.js project in MoreClient/ on :5000.
( cd MoreClient && pnpm install && pnpm dev ) &

# Backend (FastAPI) on :8000, foreground.
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
