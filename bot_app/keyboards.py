from aiogram.types import KeyboardButton, ReplyKeyboardMarkup


def phone_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="Оставить номер", request_contact=True)]],
        resize_keyboard=True,
    )


def main_menu_keyboard() -> ReplyKeyboardMarkup:
    buttons = [
        "Магазин на WB 💜",
        "Наш VK 🧡",
        "Наш Telegram 📢",
        "Наш Instagram ✅",
        "Подарок 🎁",
        "Техподдержка 🛠",
    ]

    keyboard = []
    row: list[KeyboardButton] = []
    for index, label in enumerate(buttons):
        row.append(KeyboardButton(text=label))
        if len(row) == 2 or index == len(buttons) - 1:
            keyboard.append(row[:])
            row.clear()

    return ReplyKeyboardMarkup(
        keyboard=keyboard,
        resize_keyboard=True,
    )


def support_chat_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="Завершить диалог"), KeyboardButton(text="Вернуться в меню")]
        ],
        resize_keyboard=True,
        input_field_placeholder="Напишите сообщение в поддержку",
    )
