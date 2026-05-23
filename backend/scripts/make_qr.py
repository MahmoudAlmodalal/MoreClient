"""Generate a scannable QR code for the live Telegram bot.

Looks up the bot's @username via the Telegram getMe API, builds the public
deep link https://t.me/<username>?start=demo, and renders it to a PNG the
pitch deck / printout can use.

Prerequisites: a valid bot token (the bot must already exist via BotFather).
The backend does not need to be running for this step.

Run from the repo root:
    python -m backend.scripts.make_qr --token <BOT_TOKEN>
    python -m backend.scripts.make_qr            # uses TELEGRAM_BOT_TOKEN env
"""

import argparse
import os
import sys
from pathlib import Path

import httpx
import qrcode

OUT_DIR = Path(__file__).resolve().parent / "out"


def main() -> int:
    parser = argparse.ArgumentParser(description="Make a QR code for the Telegram bot link.")
    parser.add_argument("--token", default=os.getenv("TELEGRAM_BOT_TOKEN"))
    parser.add_argument("--start", default="demo", help="?start= deep-link payload (default: demo)")
    parser.add_argument("--out", default=str(OUT_DIR / "telegram_qr.png"))
    args = parser.parse_args()

    if not args.token:
        print("ERROR: bot token required (--token or TELEGRAM_BOT_TOKEN).")
        return 2

    me = httpx.get(f"https://api.telegram.org/bot{args.token}/getMe", timeout=20).json()
    if not me.get("ok"):
        print(f"ERROR: getMe failed: {me.get('description', me)}")
        return 1
    username = me["result"]["username"]

    link = f"https://t.me/{username}"
    if args.start:
        link += f"?start={args.start}"

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img = qrcode.make(link)
    img.save(out_path)

    print(f"bot      : @{username}")
    print(f"link     : {link}")
    print(f"qr saved : {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
