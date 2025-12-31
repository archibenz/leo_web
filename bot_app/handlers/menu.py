from aiogram import F, Router
from aiogram.types import Message, URLInputFile

router = Router()

GIFT_VIDEO_FALLBACK_URL = "http://reinasleo.com/gift"


@router.message(F.text == "Магазин на WB 💜")
async def send_wb_link(message: Message):
    await message.answer(
        "Обнови свой гардероб в нашем магазине! 💜\n\n"
        "Ознакомиться с нашими товарами на Wildberries вы можете по ссылке:\n"
        "https://www.wildberries.ru/seller/609562"
    )


@router.message(F.text == "Подарок 🎁")
async def send_gift_link(message: Message):
    # Используем актуальную ссылку на подарок с Tilda
    gift_video_url = GIFT_VIDEO_FALLBACK_URL
    await message.answer_video(
        URLInputFile(gift_video_url, filename="REINASLEO_gift.mp4"),
        caption=(
            "Ваш подарок 🎁: онлайн-тренировка прямо в этом чате в качестве 1080p."
            " Приятного просмотра!"
        ),
        supports_streaming=True,
    )


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


@router.message(F.text == "Наш VK 🧡")
async def send_vk_link(message: Message):
    await message.answer(
        "Мы теперь и во ВКонтакте! Подписывайся, чтобы не пропустить новинки и акции 👉🏻\n"
        "https://vk.com/reinasleo"
    )
