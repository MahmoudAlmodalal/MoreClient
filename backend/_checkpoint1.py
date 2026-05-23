"""Integration Checkpoint 1 — runs the 5-step sequence against the real app.

Uses a throwaway SQLite file + Chroma dir so counts are clean and the run is
non-destructive to the dev DB. Keyless mode (hash-embed + extractive fallback).
"""

import os
import tempfile

_tmp = tempfile.mkdtemp(prefix="ckpt1_")
os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(_tmp, 'ckpt.db')}"
os.environ["CHROMA_DIR"] = os.path.join(_tmp, "chroma")
# Keyless demo calibration: hash-embed vectors are non-negative, so cosine
# similarity is always >= 0 and confidence = 1 - distance/2 floors at ~0.50 for
# an UNRELATED query (orthogonal). In-doc queries score higher (~0.63). So the
# escalate cutoff must sit between them; the product default (0.45) is below the
# keyless floor and would never escalate. With real OpenAI embeddings (signed
# vectors, distances up to ~2) the 0.45 default separates fine.
os.environ["CONFIDENCE_THRESHOLD"] = "0.55"

import fitz  # PyMuPDF, already used by the PDF ingester
from fastapi.testclient import TestClient

from backend.main import app
from backend.models.database import SessionLocal
from backend.services.channels.telegram import TelegramChannel
from backend.services.channels.base import Inbound


def make_pdf() -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text(
        (72, 72),
        "clientMORE Support FAQ\n\n"
        "Refund policy: customers may request a refund within 30 days of "
        "purchase. Refunds are processed to the original payment method within "
        "5 business days.\n\n"
        "Business hours: our support team is available Sunday to Thursday, "
        "9am to 5pm.",
    )
    data = doc.tobytes()
    doc.close()
    return data


def show(title: str, ok: bool, detail: str) -> None:
    mark = "PASS" if ok else "FAIL"
    print(f"[{mark}] {title}\n       {detail}\n")


from backend.models.tables import get_or_create_settings

with TestClient(app) as client:  # context manager triggers lifespan (init_db + chroma)
    # The per-tenant Setting.confidence_threshold (DB default 0.45) overrides the
    # env cutoff and sits below the keyless hash-embed floor (~0.50), so bump it.
    _db = SessionLocal()
    s = get_or_create_settings(_db)
    s.confidence_threshold = 0.55
    _db.commit()
    _db.close()

    # 1) Upload a PDF -> /api/upload
    r = client.post(
        "/api/upload",
        files={"file": ("faq.pdf", make_pdf(), "application/pdf")},
    )
    up = r.json()
    show("1. Upload PDF -> /api/upload", r.status_code == 200 and up.get("chunks", 0) > 0, f"{r.status_code} {up}")

    # 2) Ask a question about it -> /api/chat (web)
    r = client.post("/api/chat", json={
        "session_id": "demo-web-1", "message": "What is the refund policy?", "channel": "web",
    })
    web = r.json()
    answered = not web.get("escalate") and "refund" in web.get("reply", "").lower()
    show("2. Ask about the doc -> /api/chat (web)", answered,
         f"escalate={web.get('escalate')} conf={web.get('confidence')} reply={web.get('reply')[:120]!r}")

    # 3) Ask the same question on Telegram (same shared brain)
    inbound = Inbound(session_id="tg:555", text="What is the refund policy?", meta={})
    tg = TelegramChannel().reply(inbound, SessionLocal())
    tg_ok = not tg.escalate and "refund" in tg.reply.lower()
    show("3. Same question on Telegram", tg_ok,
         f"escalate={tg.escalate} conf={tg.confidence} reply={tg.reply[:120]!r}")

    # 4) Ask something NOT in the docs -> should get "I don't know" + escalate
    r = client.post("/api/chat", json={
        "session_id": "demo-web-1", "message": "How do I reset my router firmware?", "channel": "web",
    })
    unk = r.json()
    show("4. Out-of-doc question -> 'I don't know'", unk.get("escalate") is True,
         f"escalate={unk.get('escalate')} conf={unk.get('confidence')} reply={unk.get('reply')[:120]!r}")

    # 5) GET /api/analytics -> should return real data
    r = client.get("/api/analytics")
    an = r.json()
    k = an.get("kpis", {})
    show("5. GET /api/analytics", r.status_code == 200 and k.get("total_questions", 0) >= 3,
         f"total_q={k.get('total_questions')} deflection={k.get('deflection_rate')} "
         f"channels={[c['name'] for c in an.get('channel_distribution', [])]} "
         f"unanswered={len(an.get('unanswered', []))}")

print("Checkpoint 1 complete.")
