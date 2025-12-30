import logging
import re

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import ForceReply, Message

from bot_app.config import get_settings
from bot_app.states import SupportStates

logger = logging.getLogger(__name__)

router = Router()

USER_ID_PATTERN = re.compile(r"ID:\s*(\d+)")


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

    for admin_id in _admin_ids():
        try:
            await message.copy_to(admin_id)
            await message.bot.send_message(
                chat_id=admin_id,
                text=(
                    "Новое сообщение в техподдержке. Ответьте на это сообщение, "
                    "чтобы пользователь получил ответ.\n\n"
                    f"ID: {user_id}\n"
                    f"Username: @{username}\n"
                    f"Текст: {feedback}"
                ),
                reply_markup=ForceReply(selective=False),
            )
        except Exception:  # noqa: BLE001
            logger.exception("Error sending support message to admin %s", admin_id)

    await message.answer(
        "Благодарим за обратную связь! Команда поддержки скоро вернётся с ответом."
    )
    await state.clear()


@router.message(
    F.reply_to_message != None,  # noqa: E711
    F.from_user.id.in_(_admin_ids()),
)
async def handle_admin_reply(message: Message):
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

    if not username:
        username = "пользователю"

    if user_id:
        await message.bot.send_message(user_id, f"Ответ от поддержки:\n{message.text}")
        await message.answer(f"Ответ пользователю {username}")
    else:
        await message.answer(
            "Не удалось определить пользователя для ответа. Ответьте, пожалуйста, на"
            " сообщение, где указан ID клиента."
        )
