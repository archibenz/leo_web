from aiogram import F, Router
from aiogram.types import Message

router = Router()


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
