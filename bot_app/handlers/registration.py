from __future__ import annotations

import datetime
import logging

from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.types import Message

from bot_app.config import get_settings
from bot_app.keyboards import main_menu_keyboard
from bot_app.services.google_sheets import GoogleSheetsClient

router = Router()

logger = logging.getLogger(__name__)


def _sheets_client() -> GoogleSheetsClient | None:
    settings = get_settings()
    if not settings.sheet_id or not settings.credentials_file:
        return None

    return GoogleSheetsClient(settings.sheet_id, settings.credentials_file)


@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext):
    await state.clear()

    await _record_visit(message)
    await message.answer(
        "Привет! Это команда REINASLEO 💜\n\n"
        "Мы подготовили для тебя подарок и собрали самые важные ссылки ниже."
        " Выбирай раздел и продолжай знакомство с брендом!",
        reply_markup=main_menu_keyboard(),
    )


async def _record_visit(message: Message) -> None:
    client = _sheets_client()
    if not client:
        return

    username = message.from_user.username or message.from_user.first_name or "Неизвестно"
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    try:
        await client.record_visit_async(username, str(message.from_user.id), timestamp)
    except Exception:  # noqa: BLE001
        logger.exception("Failed to record visit in Google Sheets")
