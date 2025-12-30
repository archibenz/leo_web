from __future__ import annotations

from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.types import Message

from bot_app.keyboards import main_menu_keyboard

router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext):
    await state.clear()
    await message.answer(
        "Привет! Это команда REINASLEO 💜\n\n"
        "Мы подготовили для тебя подарок и собрали самые важные ссылки ниже."
        " Выбирай раздел и продолжай знакомство с брендом!",
        reply_markup=main_menu_keyboard(),
    )
