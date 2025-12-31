from __future__ import annotations

import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage

from bot_app.config import get_settings
from bot_app.handlers import register_handlers

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def run() -> None:
    settings = get_settings()
    bot = Bot(token=settings.bot_token)
    storage = MemoryStorage()
    dispatcher = Dispatcher(storage=storage)

    register_handlers(dispatcher)

    await bot.set_my_description(
        "Команда REINASLEO рада приветствовать тебя ❤️\n\n"
        "Спасибо за покупку — надеемся, что наши образы вдохновят тебя! 🫶🏻\n"
        "Смотри подарок с онлайн‑тренировкой прямо в боте и подписывайся на нас в соцсетях.\n\n"
        "Нажимая «Старт», вы соглашаетесь:\n"
        "- на обработку персональных данных: http://reinasleo.com/policy\n"
        "- на получение материалов: http://reinasleo.com/soglasie"
    )

    logger.info("Starting bot...")
    await bot.delete_webhook(drop_pending_updates=True)
    await dispatcher.start_polling(bot)


def main() -> None:
    asyncio.run(run())


if __name__ == "__main__":
    main()
