import os
import logging
import datetime
import asyncio
import re
import gspread # type: ignore
from oauth2client.service_account import ServiceAccountCredentials # type: ignore

from aiogram import Bot, Dispatcher, F, Router # type: ignore
from aiogram.types import Message, KeyboardButton, ReplyKeyboardMarkup, ForceReply # type: ignore
from aiogram.filters import CommandStart # type: ignore
from aiogram.fsm.context import FSMContext # type: ignore
from aiogram.fsm.state import State, StatesGroup # type: ignore
from aiogram.fsm.storage.memory import MemoryStorage # type: ignore

# Configuration
BOT_TOKEN = "7578717755:AAFytHif220QodfuGhZnzP911h9QpKIRx4s"
SHEET_ID = "1KIE8etQW47Dl7LKUhs8M8TE_6yJfwJT1dtgR32YgQIo"
MEDIA_PATH = "media"  # Directory for storing media files

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FSM States
class RegistrationStates(StatesGroup):
    waiting_for_phone = State()

# Support FSM States for feedback
class SupportStates(StatesGroup):
    waiting_for_feedback = State()

# Google Sheets setup
def setup_google_sheets():
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    credentials = ServiceAccountCredentials.from_json_keyfile_name("leobot-454017-1bedaa4ca18a.json", scope)
    client = gspread.authorize(credentials)
    sheet = client.open_by_key(SHEET_ID).sheet1
    return sheet

# Save user data to Google Sheets
async def save_to_google_sheets(username, user_id, phone, registration_time):
    try:
        sheet = setup_google_sheets()
        sheet.append_row([username, user_id, phone, registration_time.strftime("%Y-%m-%d %H:%M:%S")])
        return True
    except Exception as e:
        logger.error(f"Error saving to Google Sheets: {e}")
        return False

# Phone validation
def is_valid_phone(phone):
    phone_pattern = re.compile(r'^\+?\d{10,15}$')
    return bool(phone_pattern.match(phone))

# Keyboards
def get_phone_keyboard():
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="Оставить номер", request_contact=True)]],
        resize_keyboard=True
    )

def get_main_menu_keyboard():
    buttons = [
        "Магазин на WB 💜",
        "Подарок 🎁",
        "История бренда 🦋",
        "Наш Instagram ✅",
        "Уход за одеждой 👗",
        "Техподдержка 🛠",
        "Наш Telegram 📢",
        "PANDORA❤️TEAM"
    ]
    
    # Create a 2D array for keyboard layout (2 buttons per row)
    keyboard = []
    row = []
    for i, button_text in enumerate(buttons):
        row.append(KeyboardButton(text=button_text))
        if len(row) == 2 or i == len(buttons) - 1:
            keyboard.append(row[:])  # Add a copy of the current row
            row = []
            
    return ReplyKeyboardMarkup(
        keyboard=keyboard,
        resize_keyboard=True
    )

# Router initialization
router = Router()

# Start command handler
@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext):
    await state.set_state(RegistrationStates.waiting_for_phone)
    # Request contact with explanatory message
    await message.answer(
        "Чтобы забрать 🎁 подарок, пожалуйста, подтверди свои контактные данные, нажав кнопку ниже 💞",
        reply_markup=get_phone_keyboard()
    )

# Contact button handler
@router.message(RegistrationStates.waiting_for_phone, F.contact)
async def process_contact(message: Message, state: FSMContext):
    phone = message.contact.phone_number
    user_id = message.from_user.id
    username = message.from_user.username or message.from_user.first_name
    registration_time = datetime.datetime.now()
    
    success = await save_to_google_sheets(username, user_id, phone, registration_time)
    
    if success:
        await state.clear()
        await message.answer(
            "Благодарим. Контактные данные подтверждены. Выбирай в меню ниже интересующий раздел 👇🏻",
            reply_markup=get_main_menu_keyboard()
        )
    else:
        await message.answer(
            "Извините, произошла ошибка при сохранении данных. Пожалуйста, попробуйте позже."
        )

# Manual phone input handler
@router.message(RegistrationStates.waiting_for_phone)
async def process_phone_text(message: Message, state: FSMContext):
    phone = message.text.strip()
    
    if is_valid_phone(phone):
        user_id = message.from_user.id
        username = message.from_user.username or message.from_user.first_name
        registration_time = datetime.datetime.now()
        
        success = await save_to_google_sheets(username, user_id, phone, registration_time)
        
        if success:
            await state.clear()
            await message.answer(
                "Благодарим. Контактные данные подтверждены. Выбирай в меню ниже интересующий раздел 👇🏻",
                reply_markup=get_main_menu_keyboard()
            )
        else:
            await message.answer(
                "Извините, произошла ошибка при сохранении данных. Пожалуйста, попробуйте позже."
            )
    else:
        await message.answer(
            "Пожалуйста, введите корректный номер телефона или воспользуйтесь кнопкой 'Оставить номер'."
        )

# Menu handlers
@router.message(F.text == "Магазин на WB 💜")
async def send_wb_link(message: Message):
    await message.answer(
        "Обнови свой гардероб в нашем магазине! 💜\n\n"
        "Ознакомиться с нашими товарами на Wildberries вы можете по ссылке:\n"
        "https://www.wildberries.ru/brands/981057-nabiindustry"
    )

@router.message(F.text == "Подарок 🎁")
async def send_gift_link(message: Message):
    await message.answer(
        "Ваш подарок 🎁:\n"
        "http://reinasleo.com/gift"
    )

@router.message(F.text == "Уход за одеждой 👗")
async def send_care_info(message: Message):
    await message.answer("Уход за одеждой пока в разработке.")

@router.message(F.text == "История бренда 🦋")
async def send_brand_history(message: Message):
    await message.answer("История бренда пока в разработке.")

@router.message(F.text == "Наш Instagram ✅")
async def send_instagram_link(message: Message):
    await message.answer(
        "Подписывайся на нашу страничку в Instagram, чтобы всегда быть в курсе новинок! 👉🏻\n"
        "https://www.instagram.com/reinasleo"
    )

# Handler: tech support with feedback FSM
@router.message(F.text == "Техподдержка 🛠")
async def tech_support(message: Message, state: FSMContext):
    await state.set_state(SupportStates.waiting_for_feedback)
    await message.answer(
        "Напиши свои пожелания и предложения по улучшению товаров нашего магазина. Будем рады обратной связи от каждой из вас🌸"
    )

# New: send link to main Telegram channel
@router.message(F.text == "Наш Telegram 📢")
async def send_telegram_channel(message: Message):
    await message.answer(
        "Присоединяйся к нашему Telegram‑каналу REINASLEO 👉🏻\n"
        "https://t.me/reinasleo_store"
    )

@router.message(F.text == "PANDORA❤️TEAM")
async def send_pandora_channel(message: Message):
    await message.answer(
        "Присоединяйся к нашему Telegram-каналу по художественной гимнастике 👉🏻\n"
        "https://t.me/pandora_team"
    )

@router.message(SupportStates.waiting_for_feedback)
async def process_support_feedback(message: Message, state: FSMContext):
    username = message.from_user.username or message.from_user.id
    feedback = message.text
    admin_ids = [1358870721, 1023066249, 206441957]
    for admin in admin_ids:
        try:
            # Forward the original user message and capture it
            fwd = await message.bot.forward_message(
                chat_id=admin,
                from_chat_id=message.chat.id,
                message_id=message.message_id
            )
            # Send a prompt as a reply to the forwarded message, with ForceReply
            await message.bot.send_message(
                chat_id=admin,
                text=f"Новое сообщение в техподдержке от @{username}:",
                reply_markup=ForceReply(selective=False),
                reply_to_message_id=fwd.message_id
            )
        except Exception as e:
            logger.error(f"Error sending support message to {admin}: {e}")
    await message.answer("Благодарим за обратную связь!")
    await state.clear()

# Handler for admin replies to forwarded support messages
@router.message(F.reply_to_message != None, F.from_user.id.in_([1358870721, 1023066249, 206441957]))
async def handle_admin_reply(message: Message):
    orig_msg = message.reply_to_message
    user_id = None
    # Case 1: admin replied directly to the forwarded user message
    if orig_msg and orig_msg.forward_from:
        user_id = orig_msg.forward_from.id
        uname = orig_msg.forward_from.username or user_id
    # Case 2: admin replied to the prompt under the forwarded message
    elif orig_msg and orig_msg.reply_to_message and orig_msg.reply_to_message.forward_from:
        user_id = orig_msg.reply_to_message.forward_from.id
        uname = orig_msg.reply_to_message.forward_from.username or user_id

    if user_id:
        await message.bot.send_message(
            user_id,
            f"Ответ от поддержки:\n{message.text}"
        )
        await message.answer(f"Ответ пользователю @{uname}")
    else:
        await message.answer("Не удалось определить пользователя для ответа.")

# Main function
async def main():
    # Bot and dispatcher initialization
    bot = Bot(token=BOT_TOKEN)
    # Set bot description shown before /start
    await bot.set_my_description(
        "Команда NABI.industry рада приветствовать тебя ❤️\n\n"
        "Благодарим за покупку! У тебя отличный вкус 🫶🏻\n"
        "Будем рады положительному отзыву ⭐️⭐️⭐️⭐️⭐️\n\n"
        "Здесь тебя ждет 🎁 ПОДАРОК — онлайн тренировка от клуба художественной гимнастики PANDORA❤️TEAM.\n\n"
        "Нажимая «Старт», вы соглашаетесь:\n"
        "- на обработку персональных данных: http://reinasleo.com/policy\n"
        "- на получение материалов: http://reinasleo.com/soglasie"
    )
    storage = MemoryStorage()
    dp = Dispatcher(storage=storage)
    dp.include_router(router)
    
    # Start polling
    logger.info("Starting bot...")
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
