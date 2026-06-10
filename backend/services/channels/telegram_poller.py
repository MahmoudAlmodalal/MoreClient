"""Telegram long-polling loop — runs in a background thread.

When the Telegram channel is active and has a valid token, this module spawns
a daemon thread that polls getUpdates every 2 seconds. Each update is processed
through the same TelegramChannel adapter used by the webhook path, so the bot
replies identically whether updates arrive via webhook or polling.

This is essential for **localhost / development** setups where Telegram cannot
push webhook callbacks. In production with a public URL, the webhook path in
channels.py handles delivery and the poller is not started.
"""

import logging
import threading
import time

import httpx
from sqlalchemy.orm import Session

from backend.core import crypto
from backend.models.database import SessionLocal
from backend.models.tables import get_or_create_settings
from backend.services.channels.telegram import TelegramChannel

logger = logging.getLogger(__name__)

_thread: threading.Thread | None = None
_stop_event = threading.Event()


def _poll_loop() -> None:
    """Blocking loop: calls getUpdates, processes each, repeats."""
    offset = 0
    channel = TelegramChannel()
    _webhook_cleared = False

    while not _stop_event.is_set():
        db: Session | None = None
        try:
            db = SessionLocal()
            setting = get_or_create_settings(db)

            if not setting.is_telegram_active or not setting.telegram_token:
                # Channel was deactivated — stop the poller.
                logger.info("Telegram channel deactivated; stopping poller.")
                break

            token = crypto.decrypt(setting.telegram_token)
            if not token:
                # Wrong APP_SECRET or corrupted ciphertext: don't crash the
                # thread or hammer Telegram with an empty bot token. Back off
                # and recheck the setting on the next iteration.
                logger.warning("Telegram token failed to decrypt; backing off 30s.")
                time.sleep(30)
                continue

            # Telegram blocks getUpdates when a webhook is set, so delete it once.
            if not _webhook_cleared:
                try:
                    del_resp = httpx.post(
                        f"https://api.telegram.org/bot{token}/deleteWebhook",
                        timeout=10,
                    )
                    logger.info("deleteWebhook response: %s", del_resp.json())
                    _webhook_cleared = True
                except Exception:
                    logger.exception("Failed to delete Telegram webhook")

            resp = httpx.get(
                f"https://api.telegram.org/bot{token}/getUpdates",
                params={"offset": offset, "timeout": 10, "allowed_updates": '["message"]'},
                timeout=15,
            )
            data = resp.json()

            if not data.get("ok"):
                logger.warning("Telegram getUpdates failed: %s", data)
                time.sleep(5)
                continue

            for update in data.get("result", []):
                offset = update["update_id"] + 1
                try:
                    inbound = channel.parse(update, db)
                    if inbound is not None:
                        reply = channel.reply(inbound, db)
                        channel.deliver(inbound, reply, db)
                        logger.info(
                            "Telegram reply sent to chat %s",
                            inbound.meta.get("chat_id"),
                        )
                except Exception:
                    logger.exception("Error processing Telegram update %s", update.get("update_id"))

        except httpx.ReadTimeout:
            # Normal — long-poll timeout, just loop again.
            pass
        except Exception:
            logger.exception("Telegram poller error; retrying in 5s")
            time.sleep(5)
        finally:
            if db is not None:
                db.close()

        # Brief pause between iterations (unless long-poll already waited).
        if not _stop_event.is_set():
            time.sleep(1)


def start() -> None:
    """Start the polling thread if not already running."""
    global _thread
    if _thread is not None and _thread.is_alive():
        logger.debug("Telegram poller already running.")
        return

    _stop_event.clear()
    _thread = threading.Thread(target=_poll_loop, daemon=True, name="tg-poller")
    _thread.start()
    logger.info("Telegram polling thread started.")


def stop() -> None:
    """Signal the polling thread to stop."""
    global _thread
    _stop_event.set()
    if _thread is not None:
        _thread.join(timeout=5)
        _thread = None
    logger.info("Telegram polling thread stopped.")


def restart() -> None:
    """Restart the poller (e.g. after a token change)."""
    stop()
    start()


def ensure_running_if_active() -> None:
    """Check the DB settings and start the poller if Telegram is active.

    Called at app startup (lifespan) and after settings are saved.
    """
    db = SessionLocal()
    try:
        setting = get_or_create_settings(db)
        if setting.is_telegram_active and setting.telegram_token:
            start()
        else:
            stop()
    finally:
        db.close()
