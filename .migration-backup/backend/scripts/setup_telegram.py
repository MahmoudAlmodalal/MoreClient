"""Make the Telegram bot live for the demo.

Three steps, all idempotent:
  1. Persist the bot token + flip is_telegram_active=True via PUT /api/settings.
  2. Register the webhook with Telegram so updates flow to /telegram/webhook.
  3. Print getWebhookInfo so you can confirm the URL is live (and see any error).

There are NO test/allowlist restrictions in the bot code — once the settings are
on and the webhook is registered, the bot is public.

Prerequisites:
  - Backend running and reachable at --base-url (where /api/settings lives).
  - --public-url is the PUBLIC https origin Telegram can reach; the webhook is
    registered at <public-url>/telegram/webhook. Telegram requires HTTPS.

Run from the repo root (token/url can also come from env):
    python -m backend.scripts.setup_telegram --token <BOT_TOKEN> --public-url https://<host>
    set TELEGRAM_BOT_TOKEN=...; set PUBLIC_BASE_URL=https://<host>; python -m backend.scripts.setup_telegram
"""

import argparse
import os
import sys

import httpx


def main() -> int:
    parser = argparse.ArgumentParser(description="Activate the Telegram bot + register its webhook.")
    parser.add_argument("--token", default=os.getenv("TELEGRAM_BOT_TOKEN"))
    parser.add_argument("--public-url", default=os.getenv("PUBLIC_BASE_URL"))
    parser.add_argument(
        "--base-url",
        default=os.getenv("BACKEND_BASE_URL", "http://localhost:8000"),
        help="where the backend /api/settings endpoint lives",
    )
    args = parser.parse_args()

    if not args.token:
        print("ERROR: bot token required (--token or TELEGRAM_BOT_TOKEN).")
        return 2
    if not args.public_url:
        print("ERROR: public url required (--public-url or PUBLIC_BASE_URL).")
        return 2

    webhook_url = args.public_url.rstrip("/") + "/telegram/webhook"
    api = f"https://api.telegram.org/bot{args.token}"

    with httpx.Client(timeout=20) as client:
        # 1. Activate in the app's settings (snake_case keys; partial update).
        settings_resp = client.put(
            args.base_url.rstrip("/") + "/api/settings",
            json={"telegram_token": args.token, "is_telegram_active": True},
        )
        settings_resp.raise_for_status()
        out = settings_resp.json()
        print(f"1. settings: is_telegram_active={out.get('isTelegramActive')} (token stored)")

        # 2. Register the webhook with Telegram.
        set_resp = client.post(f"{api}/setWebhook", json={"url": webhook_url})
        set_body = set_resp.json()
        print(f"2. setWebhook -> {webhook_url}: ok={set_body.get('ok')} {set_body.get('description', '')}")
        if not set_body.get("ok"):
            return 1

        # 3. Confirm it's live.
        info = client.get(f"{api}/getWebhookInfo").json().get("result", {})
        print("3. getWebhookInfo:")
        print(f"     url               = {info.get('url')}")
        print(f"     pending_updates   = {info.get('pending_update_count')}")
        print(f"     last_error_message= {info.get('last_error_message', 'none')}")

    print("\nDone. Send the bot a message to smoke-test (e.g. 'What are your opening hours?').")
    return 0


if __name__ == "__main__":
    sys.exit(main())
