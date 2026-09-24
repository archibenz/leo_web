-- Соцсети сайта — один список на подвал, страницу контактов и разметку для
-- поисковиков. До 24.09.2026 адреса были вписаны в код, и подвал с контактами
-- расходились: в подвале Instagram и Telegram, в контактах Telegram и VK.
-- Начальное наполнение — все три, показаны; какие оставить, владелец отмечает
-- галочками в админке. Пишет только /api/admin/site/socials со своей
-- проверкой (https и домен своей сети), не общий PUT /api/admin/config.
INSERT INTO site_config (key, value) VALUES (
  'social_links',
  '{"links": [
     {"network": "instagram", "href": "https://instagram.com/reinasleo", "shown": true},
     {"network": "telegram",  "href": "https://t.me/reinasleo",          "shown": true},
     {"network": "vk",        "href": "https://vk.com/reinasleo",        "shown": true}
   ]}'::jsonb
) ON CONFLICT (key) DO NOTHING;
