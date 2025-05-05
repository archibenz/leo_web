import os
import logging
import datetime
import asyncio
import re
import gspread # type: ignore
from oauth2client.service_account import ServiceAccountCredentials # type: ignore

from aiogram import Bot, Dispatcher, F, Router # type: ignore
from aiogram.types import Message, KeyboardButton, ReplyKeyboardMarkup # type: ignore
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
        "PANDORA❤️ TEAM"
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
    await message.answer(
        "Привет! Команда бренда NABI.industry рада приветствовать тебя ❤️\n\n"
        "Благодарим за покупку и прекрасный выбор. У тебя отличный вкус. В нашей одежде ты будешь чувствовать себя уверенной и успешной 🫶🏻\n\n"
        "Будем рады, если ты поделишься своими впечатлениями от покупки с другими девушками в отзывах ⭐️⭐️⭐️⭐️⭐️\n\n"
        "В благодарность мы дарим тебе онлайн тренировку от профессионального тренера по художественной гимнастике нашего клуба PANDORA❤️ TEAM\n\n"
        "Чтобы убедиться, что ты реальная девчонка, а не бот, пожалуйста, подтверди свои контактные данные 💞",
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
async def send_gift_video(message: Message):
    try:
        video_path = os.path.join(MEDIA_PATH, "gift.mp4")
        with open(video_path, "rb") as video:
            await message.answer_video(
                video=video,
                caption="Специально для вас — наш подарок."
            )
    except FileNotFoundError:
        await message.answer("Извините, подарок временно недоступен.")
    except Exception as e:
        logger.error(f"Error sending video: {e}")
        await message.answer("Извините, произошла ошибка при отправке подарка.")

@router.message(F.text == "Уход за одеждой 👗")
async def send_care_info(message: Message):
    try:
        # Check for PDF first
        pdf_path = os.path.join(MEDIA_PATH, "care.pdf")
        if os.path.exists(pdf_path):
            with open(pdf_path, "rb") as pdf:
                await message.answer_document(
                    document=pdf,
                    caption="Рекомендации по уходу за нашими изделиями."
                )
            return
            
        # If no PDF, try photos
        photo_found = False
        for i in range(1, 10):
            photo_path = os.path.join(MEDIA_PATH, f"care_{i}.jpg")
            if os.path.exists(photo_path):
                with open(photo_path, "rb") as photo:
                    await message.answer_photo(
                        photo=photo,
                        caption=f"Рекомендации по уходу ({i}/?)." if i == 1 else None
                    )
                photo_found = True
        
        if not photo_found:
            await message.answer("Информация по уходу за одеждой временно недоступна.")
    except Exception as e:
        logger.error(f"Error sending care info: {e}")
        await message.answer("Извините, произошла ошибка при отправке информации.")

@router.message(F.text == "История бренда 🦋")
async def send_brand_history(message: Message):
    try:
        # Check for PDF first
        pdf_path = os.path.join(MEDIA_PATH, "history.pdf")
        if os.path.exists(pdf_path):
            with open(pdf_path, "rb") as pdf:
                await message.answer_document(
                    document=pdf,
                    caption="История бренда NABI Industry."
                )
            return
            
        # If no PDF, try photos
        photo_found = False
        for i in range(1, 10):
            photo_path = os.path.join(MEDIA_PATH, f"history_{i}.jpg")
            if os.path.exists(photo_path):
                with open(photo_path, "rb") as photo:
                    await message.answer_photo(
                        photo=photo,
                        caption=f"История бренда NABI Industry ({i}/?)." if i == 1 else None
                    )
                photo_found = True
        
        if not photo_found:
            await message.answer("История бренда временно недоступна.")
    except Exception as e:
        logger.error(f"Error sending brand history: {e}")
        await message.answer("Извините, произошла ошибка при отправке информации.")

@router.message(F.text == "Наш Instagram ✅")
async def send_instagram_link(message: Message):
    await message.answer(
        "Подписывайся на нашу страничку в Instagram, чтобы всегда быть в курсе новинок! 👉🏻\n\n"
        "https://www.instagram.com/nabi.industry/profilecard/?igsh=MzJrbWN6NWg2d213"
    )

# Handler: support in development
@router.message(F.text == "Техподдержка 🛠")
async def support_in_development(message: Message):
    await message.answer(
        "Техподдержка пока что находится в разработке 🛠\n"
        "Если у вас возникли вопросы, напишите нам позже!"
    )

# New: send link to main Telegram channel
@router.message(F.text == "Наш Telegram 📢")
async def send_telegram_channel(message: Message):
    await message.answer(
        "Присоединяйся к нашему Telegram‑каналу REINASLEO 👉🏻\n"
        "https://t.me/reinasleo_store"
    )

# New: send link to PANDORA TEAM gymnastics channel
@router.message(F.text == "PANDORA❤️ TEAM")
async def send_pandora_channel(message: Message):
    await message.answer(
        "Смотри тренировки по художественной гимнастике от PANDORA❤️ TEAM 👉🏻\n"
        "https://t.me/pandora_team"
    )

# Main function
async def main():
    # Bot and dispatcher initialization
    bot = Bot(token=BOT_TOKEN)
    storage = MemoryStorage()
    dp = Dispatcher(storage=storage)
    dp.include_router(router)
    
    # Start polling
    logger.info("Starting bot...")
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
