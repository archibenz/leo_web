import logging
import re

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)

from bot_app.config import get_settings
from bot_app.keyboards import main_menu_keyboard, support_chat_keyboard
from bot_app.states import SupportStates

logger = logging.getLogger(__name__)

router = Router()

USER_ID_PATTERN = re.compile(r"ID:\s*(\d+)")
_last_support_requests: dict[int, tuple[int, str]] = {}
STOP_LABEL = "Завершить диалог"
BACK_LABEL = "Вернуться в меню"


def _admin_ids() -> tuple[int, ...]:
    settings = get_settings()
    # Fallback to default IDs for backward compatibility
    return settings.admin_ids or (1358870721, 1023066249, 206441957)


@router.message(F.text == "Техподдержка 🛠")
async def tech_support(message: Message, state: FSMContext):
    await state.set_state(SupportStates.waiting_for_feedback)
    await message.answer(
        "Ты в чате с техподдержкой.\n"
        "Пиши сюда любые сообщения, прикладывай фото/видео — всё уйдёт в поддержку,"
        " а ответы будут приходить сюда же.\n\n"
        "Можешь завершить диалог или вернуться в меню кнопкой ниже.",
        reply_markup=support_chat_keyboard(),
    )


@router.message(
    SupportStates.waiting_for_feedback,
    F.text.in_({STOP_LABEL, BACK_LABEL}),
)
async def stop_support_with_button(message: Message, state: FSMContext):
    await state.clear()
    await message.answer(
        "Диалог с поддержкой завершён. Чем ещё помочь?",
        reply_markup=main_menu_keyboard(),
    )


@router.message(SupportStates.waiting_for_feedback)
async def process_support_feedback(message: Message, state: FSMContext):
    username = message.from_user.username or message.from_user.first_name or "Без ника"
    user_id = message.from_user.id
    feedback = message.text or "<нет текста>"

    for admin_id in _admin_ids():
        try:
            await message.copy_to(admin_id)
            await message.bot.send_message(
                chat_id=admin_id,
                text=(
                    "Новое сообщение в техподдержке.\n\n"
                    f"ID: {user_id}\n"
                    f"Username: @{username}\n"
                    f"Текст: {feedback}"
                ),
                reply_markup=InlineKeyboardMarkup(
                    inline_keyboard=[
                        [
                            InlineKeyboardButton(
                                text=f"Ответить пользователю @{username}",
                                callback_data=f"support_reply:{user_id}",
                            )
                        ]
                    ]
                ),
            )
            _last_support_requests[admin_id] = (user_id, username)
        except Exception:  # noqa: BLE001
            logger.exception("Error sending support message to admin %s", admin_id)

    data = await state.get_data()
    if not data.get("notified"):
        await state.update_data(notified=True)
        await message.answer(
            "Передала сообщение в поддержку. Ответ придёт сюда же, продолжай диалог,"
            " если нужно уточнить детали."
        )


@router.callback_query(F.data.startswith("support_reply:"), F.from_user.id.in_(_admin_ids()))
async def pick_user_from_button(callback_query, state: FSMContext):
    try:
        _, user_id_str = callback_query.data.split("support_reply:", maxsplit=1)
        user_id = int(user_id_str)
    except Exception:
        await callback_query.answer("Не получилось определить пользователя")
        return

    username = None
    try:
        user = await callback_query.bot.get_chat(user_id)
        username = user.username or user.first_name or "пользователь"
    except Exception:
        username = "пользователь"

    _last_support_requests[callback_query.from_user.id] = (user_id, username)
    await callback_query.answer("Диалог выбран")
    await callback_query.message.answer(
        f"Ответ отправится пользователю @{username}. Напиши сообщение."
    )


@router.message(F.from_user.id.in_(_admin_ids()))
async def handle_admin_message(message: Message):
    original_message = message.reply_to_message
    user_id = None
    username = None

    if original_message and original_message.text:
        match = USER_ID_PATTERN.search(original_message.text)
        if match:
            user_id = int(match.group(1))

        if "Username:" in original_message.text:
            parts = original_message.text.split("Username:", maxsplit=1)
            if len(parts) == 2:
                username = parts[1].strip().split("\n", maxsplit=1)[0]

    if not user_id:
        fallback = _last_support_requests.get(message.from_user.id)
        if fallback:
            user_id, username = fallback

    if not username:
        username = "пользователю"

    if user_id:
        await message.copy_to(user_id)
        await message.answer(f"Ответ пользователю {username}")
    else:
        await message.answer(
            "Не удалось определить пользователя для ответа. Ответьте на сообщение из"
            " техподдержки, где указан ID клиента."
        )
