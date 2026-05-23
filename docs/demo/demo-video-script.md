# clientMORE — 60-Second Backup Demo Video

A self-contained recording to play if the live demo fails (network, webhook, or
LLM hiccup). Screen-record a phone (Telegram) and a browser (dashboard). Keep it
tight — every second earns its place. On-screen captions in English; the bot
itself shows both languages.

| Time | Shot | On-screen / action | Voiceover (EN) |
|------|------|--------------------|----------------|
| 0:00–0:10 | Title card → QR | "clientMORE" + QR code | "Small organizations get the same questions, all day, in two languages. clientMORE answers them — from your own documents." |
| 0:10–0:25 | Phone: Telegram chat | Scan QR, type **"What are your opening hours?"**, bot replies from the NGO FAQ | "Scan the code, and you're talking to a bot trained on the organization's real documents — no hallucinations." |
| 0:25–0:40 | Phone: Telegram chat | Type **"ما هي ساعات العمل؟"**, bot replies in Arabic (RTL) | "Ask in Arabic, and it answers in Arabic — automatic language detection, right-to-left, same knowledge." |
| 0:40–0:50 | Phone: Telegram chat | Type **"I'd like to talk to a human"**, bot offers a human + logs the chat | "And when the customer wants a person, it hands off to a human and logs the conversation." |
| 0:50–0:60 | Browser: dashboard Handoffs → QR | Show the escalated question in the queue, end on the QR | "Your documents, in any language, on every channel — with a human always one tap away. Scan to try it." |

## Production notes

- **Length:** trim to ≤ 60s; cut typing dead-time, keep the bot's reply animation.
- **Setup:** run `seed_demo.py` + `setup_telegram.py` first so the recording matches the live flow.
- **Captions:** burn in the question being typed so it's legible at small sizes.
- **Audio:** one clear voiceover pass; add soft background music under -18 dB.
- **Export:** 1080×1920 (vertical, phone-first) or 1920×1080 if it leads with the dashboard.
- **Fallback within the fallback:** if Arabic rendering looks off in the recorder, capture the AR turn on the real phone screen rather than an emulator.
