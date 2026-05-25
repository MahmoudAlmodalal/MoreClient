# clientMORE — 5-Minute Live Demo Script

**Product:** clientMORE — a bilingual (AR/EN) AI support assistant that answers
from your own documents across web, Telegram, and WhatsApp, and hands off to a
human when it isn't confident.

**Demo persona:** "Amal Foundation" — a community relief & education NGO whose
FAQ is loaded as the knowledge base.

## Before you walk on stage (checklist)

- [ ] `python -m backend.scripts.seed_demo` run **before** starting the backend → both NGO docs `status=completed`.
- [ ] Backend (re)started **after** seeding, reachable at the public HTTPS URL. (Seeding rewrites the Chroma store from a separate process; a running server caches the old collection and will 500 on retrieval until restarted — always seed first, then start/restart the server.)
- [ ] `python -m backend.scripts.setup_telegram ...` run → `getWebhookInfo` shows the URL, no `last_error_message`.
- [ ] `python -m backend.scripts.make_qr ...` run → `telegram_qr.png` on the title slide.
- [ ] Phone with the bot open, mirrored to the projector (or a second device).
- [ ] Dashboard open in a browser tab: Files, Handoffs, Settings.
- [ ] Latency number from `benchmark_chat.py` noted (p95 < 3s) for the "how it works" beat.

## Timeline

**0:00 — 1:00 · The problem**
> "Small organizations — NGOs, clinics, shops — get the same questions over and over,
> in more than one language, around the clock. They can't staff a 24/7 bilingual desk.
> Generic chatbots either make things up or can't read Arabic. clientMORE answers from
> *your* documents, in Arabic and English, and knows when to escalate to a human."

Show the title slide with the QR code. Invite the audience to scan it now.

**1:00 — 1:30 · Scan the QR, live**
Scan the QR yourself on the mirrored phone. Open the Telegram chat with the Amal
Foundation bot. "This is the exact same bot the audience just scanned — it's public."

**1:30 — 2:15 · Answer in English**
Type: **"What are your opening hours?"**
The bot replies with the NGO's hours from the FAQ. Point out it's grounded in the
uploaded document, not invented.
Optional follow-up: **"How can I donate?"** to show multi-turn.

**2:15 — 3:00 · Answer in Arabic (RTL + language match)**
Type: **"ما هي ساعات العمل؟"**
The bot replies *in Arabic*. Highlight: same knowledge, automatic language detection,
correct right-to-left rendering — no separate setup.

**3:00 — 3:45 · Graceful escalation**
Type: **"I'd like to talk to a human agent"** (or in Arabic **"أريد التحدث مع موظف"**).
The bot doesn't try to fake it — it offers a human and logs the conversation for handoff.
> "When the customer asks for a person — or the bot isn't confident enough — it escalates
> instead of guessing, and logs the question for a human."

> **Demo-mode note (read before the demo):** the human-request keyword escalation is
> *deterministic* — it works in both keyless and API-key modes, so use it live. The
> *confidence-based* escalation (off-topic question → "I don't know") only separates
> cleanly when running with a real `OPENAI_API_KEY` (semantic embeddings). In keyless
> mode, lexical confidence interleaves, so don't rely on an off-topic question to
> escalate on stage. If you have an API key set, you can also demo: ask something
> off-topic and watch it decline on low confidence.

**3:45 — 4:30 · The dashboard**
Switch to the dashboard:
- **Files** — the two NGO documents that power the answers (this is how a customer
  onboards: drop in a PDF/DOCX/TXT, no engineering).
- **Handoffs** — the escalated question from the previous step is now in the queue
  for a human to answer (and that answer can be *taught back* to the bot).
- **Settings** — the confidence threshold and channel toggles; one place to tune behavior.

**4:30 — 5:00 · Why it scales / the ask**
> "Under the hood it's a modular FastAPI service: ingestion → retrieval → confidence-gated
> answer, with the same brain serving web, Telegram, and WhatsApp. Median response under
> [X] seconds. It even runs without an LLM API key as a deterministic fallback, so a demo
> or a low-budget deployment never goes dark."

Close on the QR slide again — "scan it, it's live right now." State the ask
(pilot customers / funding / next milestone).

## If something breaks (recovery)

- Bot slow or webhook hiccup → switch to the **1-minute backup video** (see `demo-video-script.md`).
- LLM API issue → the keyless fallback still answers from the KB; keep going, mention it as a feature.
- Wrong/empty answer → re-run `seed_demo.py`, **then restart the backend** (do not re-seed against a live server); verify `GET /api/files` shows `completed` docs.
