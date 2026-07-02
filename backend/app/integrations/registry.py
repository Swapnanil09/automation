"""Registry of available channels + factory helpers."""

from __future__ import annotations

from app.integrations.base import Channel, ChannelError
from app.integrations.gmail import GmailChannel
from app.integrations.telegram import TelegramChannel
from app.integrations.whatsapp import WhatsAppChannel
from app.integrations.sql import SqlChannel
from app.integrations.excel import ExcelChannel
from app.integrations.compress import CompressChannel
from app.integrations.sftp import SftpChannel

_CHANNELS: dict[str, type[Channel]] = {
    GmailChannel.type: GmailChannel,
    TelegramChannel.type: TelegramChannel,
    WhatsAppChannel.type: WhatsAppChannel,
    SqlChannel.type: SqlChannel,
    ExcelChannel.type: ExcelChannel,
    CompressChannel.type: CompressChannel,
    SftpChannel.type: SftpChannel,
}


def channel_types() -> list[str]:
    return list(_CHANNELS)


def get_channel_class(channel_type: str) -> type[Channel]:
    cls = _CHANNELS.get(channel_type)
    if cls is None:
        raise ChannelError(f"Unknown channel type: {channel_type}")
    return cls


def build_channel(channel_type: str, config: dict[str, str]) -> Channel:
    cls = get_channel_class(channel_type)
    cls.validate_config(config)
    return cls(config)


def catalog() -> list[dict]:
    """Static description of every channel for the settings UI."""
    items: list[dict] = []
    for cls in _CHANNELS.values():
        if not cls.config_fields:
            continue
        items.append(
            {
                "type": cls.type,

                "label": cls.label,
                "send_hint": cls.send_hint,
                "supports_attachments": cls.supports_attachments,
                "supports_subject": cls.supports_subject,
                "supports_html": cls.supports_html,
                "config_fields": [
                    {
                        "key": f.key,
                        "label": f.label,
                        "secret": f.secret,
                        "required": f.required,
                        "help": f.help,
                        "placeholder": f.placeholder,
                    }
                    for f in cls.config_fields
                ],
            }
        )
    return items
