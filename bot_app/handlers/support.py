import logging

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import ForceReply, Message

from bot_app.config import get_settings
from bot_app.states import SupportStates

logger = logging.getLogger(__name__)

router = Router()


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
    username = message.from_user.username or message.from_user.id
    feedback = message.text

    for admin_id in _admin_ids():
        try:
            forwarded_message = await message.bot.forward_message(
                chat_id=admin_id,
                from_chat_id=message.chat.id,
                message_id=message.message_id,
            )
            await message.bot.send_message(
                chat_id=admin_id,
                text=f"Новое сообщение в техподдержке от @{username}:",
                reply_markup=ForceReply(selective=False),
                reply_to_message_id=forwarded_message.message_id,
            )
        except Exception:  # noqa: BLE001
            logger.exception("Error sending support message to admin %s", admin_id)

    await message.answer("Благодарим за обратную связь!")
    await state.clear()


@router.message(
    F.reply_to_message != None,  # noqa: E711
    F.from_user.id.in_(_admin_ids()),
)
async def handle_admin_reply(message: Message):
    original_message = message.reply_to_message
    user_id = None
    username = None

    if original_message and original_message.forward_from:
        user_id = original_message.forward_from.id
        username = original_message.forward_from.username or user_id
    elif original_message and original_message.reply_to_message and original_message.reply_to_message.forward_from:
        forwarded_from = original_message.reply_to_message.forward_from
        user_id = forwarded_from.id
        username = forwarded_from.username or user_id

    if user_id:
        await message.bot.send_message(user_id, f"Ответ от поддержки:\n{message.text}")
        await message.answer(f"Ответ пользователю @{username}")
    else:
        await message.answer("Не удалось определить пользователя для ответа.")
