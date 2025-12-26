from __future__ import annotations

import datetime
import logging

from aiogram import F, Router
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.types import Message

from bot_app.config import get_settings
from bot_app.keyboards import main_menu_keyboard, phone_keyboard
from bot_app.services.google_sheets import GoogleSheetsClient
from bot_app.states import RegistrationStates
from bot_app.utils.validators import is_valid_phone

logger = logging.getLogger(__name__)

router = Router()


def _sheets_client() -> GoogleSheetsClient:
    settings = get_settings()
    return GoogleSheetsClient(settings.sheet_id, settings.credentials_file)


async def _save_contact(username: str, user_id: int, phone: str, timestamp: datetime.datetime) -> bool:
    try:
        client = _sheets_client()
        await client.append_row_async(
            [username, str(user_id), phone, timestamp.strftime("%Y-%m-%d %H:%M:%S")]
        )
        return True
    except Exception:  # noqa: BLE001
        logger.exception("Failed to save contact info to Google Sheets")
        return False


@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext):
    await state.set_state(RegistrationStates.waiting_for_phone)
    await message.answer(
        "Чтобы забрать 🎁 подарок, пожалуйста, подтверди свои контактные данные, нажав кнопку ниже 💞",
        reply_markup=phone_keyboard(),
    )


@router.message(RegistrationStates.waiting_for_phone, F.contact)
async def process_contact(message: Message, state: FSMContext):
    contact = message.contact
    if not contact:
        await message.answer("Не удалось получить номер телефона. Попробуй снова.")
        return

    username = message.from_user.username or message.from_user.first_name or "Неизвестно"
    registration_time = datetime.datetime.now()

    success = await _save_contact(
        username=username,
        user_id=message.from_user.id,
        phone=contact.phone_number,
        timestamp=registration_time,
    )

    if success:
        await state.clear()
        await message.answer(
            "Благодарим. Контактные данные подтверждены. Выбирай в меню ниже интересующий раздел 👇🏻",
            reply_markup=main_menu_keyboard(),
        )
    else:
        await message.answer(
            "Извините, произошла ошибка при сохранении данных. Пожалуйста, попробуйте позже."
        )


@router.message(RegistrationStates.waiting_for_phone)
async def process_phone_text(message: Message, state: FSMContext):
    phone = (message.text or "").strip()
    if not is_valid_phone(phone):
        await message.answer(
            "Пожалуйста, введите корректный номер телефона или воспользуйтесь кнопкой 'Оставить номер'."
        )
        return

    username = message.from_user.username or message.from_user.first_name or "Неизвестно"
    registration_time = datetime.datetime.now()

    success = await _save_contact(
        username=username,
        user_id=message.from_user.id,
        phone=phone,
        timestamp=registration_time,
    )

    if success:
        await state.clear()
        await message.answer(
            "Благодарим. Контактные данные подтверждены. Выбирай в меню ниже интересующий раздел 👇🏻",
            reply_markup=main_menu_keyboard(),
        )
    else:
        await message.answer(
            "Извините, произошла ошибка при сохранении данных. Пожалуйста, попробуйте позже."
        )
