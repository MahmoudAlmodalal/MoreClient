"""ChannelFactory — resolve a Channel implementation by name.

Routers and the WebSocket handler ask the factory for the channel they serve
rather than importing concrete classes, so adding a channel is a one-line
registry change.
"""

from backend.services.channels.base import Channel
from backend.services.channels.telegram import TelegramChannel
from backend.services.channels.web import WebChannel
from backend.services.channels.whatsapp import WhatsAppChannel


class ChannelFactory:
    _registry: dict[str, type[Channel]] = {
        "telegram": TelegramChannel,
        "whatsapp": WhatsAppChannel,
        "web": WebChannel,
    }

    @classmethod
    def get(cls, channel_type: str) -> Channel:
        try:
            return cls._registry[channel_type]()
        except KeyError as exc:
            raise ValueError(f"unknown channel: {channel_type!r}") from exc
