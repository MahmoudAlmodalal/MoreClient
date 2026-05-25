"""Channel adapters: normalize inbound webhooks -> ChatService -> send reply.

Telegram and WhatsApp both route through the same ChatService brain, differing
only in how they parse the inbound payload and deliver the outbound reply.
"""
