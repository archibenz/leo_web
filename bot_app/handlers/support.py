import logging
import re
from typing import Optional

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import Message

from bot_app.config import get_settings
from bot_app.keyboards import admin_support_keyboard, main_menu_keyboard
from bot_app.states import SupportStates

logger = logging.getLogger(__name__)

router = Router()

USER_ID_PATTERN = re.compile(r"ID:\s*(\d+)")
USERNAME_PATTERN = re.compile(r"Username:\s*@?([^\s]+)")

# In-memory mapping of admin chat sessions to the user they are assisting
active_admin_chats: dict[int, dict[str, str | int]] = {}


def _admin_ids() -> tuple[int, ...]:
    settings = get_settings()
    # Fallback to default IDs for backward compatibility
    return settings.admin_ids or (1358870721, 1023066249, 206441957)


@router.message(F.text == "Техподдержка 🛠")
async def tech_support(message: Message, state: FSMContext):
    await state.set_state(SupportStates.waiting_for_feedback)
    await message.answer(
        "Опиши, пожалуйста, вопрос или проблему максимально подробно: номер заказа,"
        " артикул товара, фото/видео и контакт для связи. Мы быстро передадим запрос"
        " в поддержку и вернемся с ответом в этом чате."
    )


@router.message(SupportStates.waiting_for_feedback)
async def process_support_feedback(message: Message, state: FSMContext):
    username = message.from_user.username or message.from_user.first_name or "Без ника"
    user_id = message.from_user.id
    feedback = message.text or "<нет текста>"
    admin_prompt = (
        "Новое сообщение в техподдержке.\n\n"
        f"ID: {user_id}\n"
        f"Username: @{username}\n"
        f"Текст: {feedback}\n\n"
        f"Вы в чате с пользователем @{username}. Все сообщения отсюда уходят ему."
    )

    reply_markup = admin_support_keyboard(username)

    for admin_id in _admin_ids():
        try:
            if message.content_type == "text":
                await message.bot.send_message(
                    chat_id=admin_id,
                    text=admin_prompt,
                    reply_markup=reply_markup,
                )
            else:
                await message.copy_to(
                    admin_id,
                    caption=admin_prompt,
                    reply_markup=reply_markup,
                )

            active_admin_chats[admin_id] = {"user_id": user_id, "username": username}
        except Exception:  # noqa: BLE001
            logger.exception("Error sending support message to admin %s", admin_id)

    await message.answer(
        "Благодарим за обратную связь! Команда поддержки скоро вернётся с ответом."
    )
    await state.clear()


def _parse_username(text: str) -> Optional[str]:
    username_match = USERNAME_PATTERN.search(text)
    if username_match:
        return username_match.group(1)
    return None


def _parse_user_from_message(message: Message) -> tuple[Optional[int], Optional[str]]:
    if not message.text:
        return None, None

    user_id = None
    username = _parse_username(message.text)

    match = USER_ID_PATTERN.search(message.text)
    if match:
        user_id = int(match.group(1))

    return user_id, username


def _end_chat_label(username: str) -> str:
    return f"Выйти из чата с @{username}"


@router.message(F.from_user.id.in_(_admin_ids()))
async def handle_admin_support_chat(message: Message):
    admin_id = message.from_user.id
    session = active_admin_chats.get(admin_id)

    # Allow exiting the active session
    if session and message.text:
        if message.text == _end_chat_label(str(session.get("username", ""))):
            active_admin_chats.pop(admin_id, None)
            await message.answer(
                "Вы вышли из диалога поддержки.", reply_markup=main_menu_keyboard()
            )
            return

        if message.text == "Выйти в меню":
            active_admin_chats.pop(admin_id, None)
            await message.answer("Возвращаемся в меню.", reply_markup=main_menu_keyboard())
            return

    # If admin replies to the prompt, refresh the session mapping
    if not session and message.reply_to_message:
        user_id, username = _parse_user_from_message(message.reply_to_message)
        if user_id:
            session = {"user_id": user_id, "username": username or "пользователю"}
            active_admin_chats[admin_id] = session

    if not session:
        return

    user_id = int(session.get("user_id", 0))
    username = session.get("username", "пользователю") or "пользователю"

    try:
        if message.content_type == "text":
            await message.bot.send_message(
                user_id, f"Сообщение от поддержки:\n{message.text}"
            )
        else:
            await message.copy_to(user_id)
    except Exception:  # noqa: BLE001
        await message.answer(
            "Не удалось отправить сообщение пользователю. Попробуйте ещё раз позднее.",
            reply_markup=admin_support_keyboard(str(username)),
        )
        return

    # Keep the keyboard pinned without adding noisy confirmations
    return
