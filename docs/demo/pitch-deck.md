# clientMORE — Pitch Deck Outline (≈10 slides, 5 min)

Paste each slide block into your slide tool. Keep text minimal on screen — the
talk track lives in `DEMO-SCRIPT.md`. Replace `[X]` with the measured p50/p95
latency from `backend/scripts/benchmark_chat.py`.

---

### Slide 1 — Title + QR
- **clientMORE** — your documents, answering in Arabic & English, on every channel.
- Large **QR code** (`backend/scripts/out/telegram_qr.png`) → "Scan to chat with our demo NGO bot, live."
- Presenter name / date.

### Slide 2 — The problem
- Small orgs (NGOs, clinics, shops) answer the same questions 24/7, in multiple languages.
- Can't staff a round-the-clock bilingual support desk.
- Generic chatbots hallucinate, ignore your real docs, and handle Arabic poorly.

### Slide 3 — The solution
- An AI assistant that answers **from your own documents**.
- **Bilingual AR/EN** with automatic language detection + RTL.
- **Knows its limits** — escalates to a human instead of guessing.

### Slide 4 — Live demo (cue slide)
- One line: "Let's talk to it." → switch to the mirrored phone.
- (Demo: EN question → AR question → off-topic escalation. See DEMO-SCRIPT.md.)

### Slide 5 — How it works
- Upload docs → chunk → embed → vector retrieval (Chroma).
- Confidence-gated: answer when confident, **escalate when not**.
- Multi-turn memory; same brain across Web / Telegram / WhatsApp.
- Median response **< [X]s**.

### Slide 6 — Architecture
- Modular FastAPI monolith: ingestion → AI/RAG → channels.
- Pluggable channels (web widget, Telegram webhook, WhatsApp/Twilio).
- SQLite/Postgres + Chroma vector store; OpenAI/Anthropic optional.

### Slide 7 — Differentiators
- **True bilingual AR/EN + RTL**, not bolted on.
- **Human handoff + learn-back**: escalated answers train the bot.
- **Keyless resilience**: deterministic fallback runs with no LLM key — demos and
  low-budget deployments never go dark.
- Self-serve onboarding: drop in a PDF/DOCX/TXT, no engineering.

### Slide 8 — Who it's for / traction
- NGOs, clinics, local businesses, public services.
- (Add any pilots, signups, or letters of intent here.)

### Slide 9 — Roadmap / the ask
- Near term: analytics, more channels, richer admin.
- The ask: pilot customers / funding / partner orgs (state the specific number).

### Slide 10 — Thanks + QR
- "Try it now" — repeat the **QR code** and contact details.
