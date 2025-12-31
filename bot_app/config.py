from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

from aiogram.utils.token import TokenValidationError, validate_token


@dataclass(slots=True)
class Settings:
    bot_token: str
    sheet_id: str | None
    credentials_file: Path | None
    admin_ids: tuple[int, ...]


def _parse_admin_ids(raw_value: str | None) -> tuple[int, ...]:
    if not raw_value:
        return tuple()
    ids: list[int] = []
    for part in raw_value.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            ids.append(int(part))
        except ValueError:
            continue
    return tuple(ids)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    load_dotenv()
    bot_token = os.getenv("BOT_TOKEN")
    sheet_id = os.getenv("SHEET_ID")
    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    admin_ids_raw = os.getenv("ADMIN_IDS")

    if not bot_token:
        raise RuntimeError("BOT_TOKEN environment variable is required")

    try:
        validate_token(bot_token)
    except TokenValidationError as exc:
        raise RuntimeError(
            "BOT_TOKEN is set but invalid. Copy the token exactly as provided by BotFather"
        ) from exc

    return Settings(
        bot_token=bot_token,
        sheet_id=sheet_id,
        credentials_file=Path(credentials_path) if credentials_path else None,
        admin_ids=_parse_admin_ids(admin_ids_raw),
    )
