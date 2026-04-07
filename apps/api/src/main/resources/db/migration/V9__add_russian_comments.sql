-- =============================================
-- V9: Russian comments on tables and columns
-- Improves readability in Adminer/pgAdmin/Metabase
-- =============================================

-- ====== USERS ======
COMMENT ON TABLE users IS 'Пользователи (зарегистрированные через сайт или Telegram-бот)';
COMMENT ON COLUMN users.id IS 'Уникальный ID пользователя (UUID)';
COMMENT ON COLUMN users.email IS 'Email (может отсутствовать у Telegram-пользователей)';
COMMENT ON COLUMN users.name IS 'Имя пользователя';
COMMENT ON COLUMN users.surname IS 'Фамилия';
COMMENT ON COLUMN users.password_hash IS 'Хеш пароля (BCrypt). Отсутствует у Telegram-пользователей';
COMMENT ON COLUMN users.date_of_birth IS 'Дата рождения';
COMMENT ON COLUMN users.phone IS 'Телефон';
COMMENT ON COLUMN users.telegram_id IS 'ID пользователя в Telegram (если регистрировался через бота)';
COMMENT ON COLUMN users.role IS 'Роль: user (обычный) или admin';
COMMENT ON COLUMN users.newsletter IS 'Согласие на email-рассылку (общее)';
COMMENT ON COLUMN users.newsletter_promos IS 'Согласие на акции и скидки';
COMMENT ON COLUMN users.newsletter_collections IS 'Согласие на новости коллекций';
COMMENT ON COLUMN users.newsletter_projects IS 'Согласие на новости проектов';
COMMENT ON COLUMN users.privacy_accepted IS 'Согласие с политикой конфиденциальности (152-ФЗ)';
COMMENT ON COLUMN users.created_at IS 'Дата регистрации';
COMMENT ON COLUMN users.updated_at IS 'Дата последнего изменения профиля';

-- ====== PRODUCTS ======
COMMENT ON TABLE products IS 'Каталог товаров (одежда)';
COMMENT ON COLUMN products.id IS 'Уникальный slug товара (например: wl-evening-gown)';
COMMENT ON COLUMN products.title IS 'Название товара';
COMMENT ON COLUMN products.subtitle IS 'Подзаголовок (например: Evening · Silk)';
COMMENT ON COLUMN products.description IS 'Полное описание товара';
COMMENT ON COLUMN products.price IS 'Цена в основной валюте';
COMMENT ON COLUMN products.image IS 'Главное изображение (URL или путь)';
COMMENT ON COLUMN products.images IS 'Дополнительные изображения (JSON массив)';
COMMENT ON COLUMN products.category IS 'Категория (dresses, outerwear, knitwear и т.д.)';
COMMENT ON COLUMN products.sizes IS 'Доступные размеры (массив: XS, S, M, L, XL)';
COMMENT ON COLUMN products.collection_id IS 'Принадлежность к коллекции (см. таблицу collections)';
COMMENT ON COLUMN products.stock_quantity IS 'Количество на складе';
COMMENT ON COLUMN products.low_stock_threshold IS 'Порог низкого остатка для уведомлений';
COMMENT ON COLUMN products.is_test IS 'Тестовый товар (не показывать в реальном каталоге)';
COMMENT ON COLUMN products.active IS 'Опубликован ли товар';
COMMENT ON COLUMN products.occasion IS 'Случай носки (evening, office, casual, ceremony, resort)';
COMMENT ON COLUMN products.color IS 'Основной цвет';
COMMENT ON COLUMN products.material IS 'Основной материал (silk, wool, cashmere, linen и т.д.)';
COMMENT ON COLUMN products.sku IS 'Внутренний артикул товара';
COMMENT ON COLUMN products.care_instructions IS 'Инструкции по уходу (JSON)';
COMMENT ON COLUMN products.created_at IS 'Дата создания товара';
COMMENT ON COLUMN products.updated_at IS 'Дата последнего обновления';

-- ====== COLLECTIONS ======
COMMENT ON TABLE collections IS 'Коллекции товаров (например: Autumn Essence 2024, Winter Luxe 2024)';
COMMENT ON COLUMN collections.id IS 'Уникальный ID коллекции (UUID)';
COMMENT ON COLUMN collections.name IS 'Название коллекции';
COMMENT ON COLUMN collections.slug IS 'URL-идентификатор (например: autumn-essence-2024)';
COMMENT ON COLUMN collections.description IS 'Описание коллекции';
COMMENT ON COLUMN collections.image_url IS 'Главное изображение коллекции';
COMMENT ON COLUMN collections.active IS 'Опубликована ли коллекция';
COMMENT ON COLUMN collections.sort_order IS 'Порядок сортировки (меньше = выше)';
COMMENT ON COLUMN collections.created_at IS 'Дата создания';
COMMENT ON COLUMN collections.updated_at IS 'Дата последнего изменения';

-- ====== CARTS & CART ITEMS ======
COMMENT ON TABLE carts IS 'Корзины пользователей (одна на пользователя)';
COMMENT ON COLUMN carts.id IS 'Уникальный ID корзины';
COMMENT ON COLUMN carts.user_id IS 'Владелец корзины (FK на users)';
COMMENT ON COLUMN carts.created_at IS 'Дата создания корзины';
COMMENT ON COLUMN carts.updated_at IS 'Дата последнего изменения';

COMMENT ON TABLE cart_items IS 'Товары в корзинах пользователей';
COMMENT ON COLUMN cart_items.id IS 'Уникальный ID позиции';
COMMENT ON COLUMN cart_items.cart_id IS 'Корзина (FK на carts)';
COMMENT ON COLUMN cart_items.product_id IS 'Товар (FK на products)';
COMMENT ON COLUMN cart_items.size IS 'Выбранный размер (XS/S/M/L/XL)';
COMMENT ON COLUMN cart_items.quantity IS 'Количество единиц товара';
COMMENT ON COLUMN cart_items.created_at IS 'Когда добавили в корзину';

-- ====== FAVORITES ======
COMMENT ON TABLE favorites IS 'Избранные товары пользователей (wishlist)';
COMMENT ON COLUMN favorites.id IS 'Уникальный ID записи';
COMMENT ON COLUMN favorites.user_id IS 'Пользователь (FK на users)';
COMMENT ON COLUMN favorites.product_id IS 'Товар (FK на products)';
COMMENT ON COLUMN favorites.created_at IS 'Когда добавили в избранное';

-- ====== ORDERS & ORDER ITEMS ======
COMMENT ON TABLE orders IS 'Заказы пользователей';
COMMENT ON COLUMN orders.id IS 'Уникальный ID заказа';
COMMENT ON COLUMN orders.user_id IS 'Покупатель (FK на users)';
COMMENT ON COLUMN orders.status IS 'Статус: pending, paid, shipped, delivered, cancelled';
COMMENT ON COLUMN orders.total IS 'Общая сумма заказа';
COMMENT ON COLUMN orders.created_at IS 'Дата заказа';
COMMENT ON COLUMN orders.updated_at IS 'Дата последнего изменения статуса';

COMMENT ON TABLE order_items IS 'Состав заказов (товары в каждом заказе)';
COMMENT ON COLUMN order_items.id IS 'Уникальный ID позиции';
COMMENT ON COLUMN order_items.order_id IS 'Заказ (FK на orders)';
COMMENT ON COLUMN order_items.product_id IS 'Товар (FK на products)';
COMMENT ON COLUMN order_items.size IS 'Размер';
COMMENT ON COLUMN order_items.quantity IS 'Количество';
COMMENT ON COLUMN order_items.price IS 'Цена за единицу на момент заказа (фиксируется)';

-- ====== PRODUCT INTEREST EVENTS (analytics) ======
COMMENT ON TABLE product_interest_events IS 'События интереса к товарам (для аналитики и рекомендаций)';
COMMENT ON COLUMN product_interest_events.id IS 'Уникальный ID события';
COMMENT ON COLUMN product_interest_events.user_id IS 'Пользователь (может быть NULL для анонимов)';
COMMENT ON COLUMN product_interest_events.product_id IS 'Товар (FK на products)';
COMMENT ON COLUMN product_interest_events.event_type IS 'Тип: add_to_cart, add_to_favorite, purchase';
COMMENT ON COLUMN product_interest_events.created_at IS 'Время события';

-- ====== VERIFICATION CODES (email auth) ======
COMMENT ON TABLE verification_codes IS 'Коды email-верификации (для подтверждения почты при регистрации)';
COMMENT ON COLUMN verification_codes.id IS 'Уникальный ID кода';
COMMENT ON COLUMN verification_codes.email IS 'Email на который отправлен код';
COMMENT ON COLUMN verification_codes.code IS '6-значный код подтверждения';
COMMENT ON COLUMN verification_codes.expires_at IS 'Когда код истекает';
COMMENT ON COLUMN verification_codes.used IS 'Был ли код использован';
COMMENT ON COLUMN verification_codes.created_at IS 'Когда код был сгенерирован';

-- ====== TELEGRAM AUTH TOKENS ======
COMMENT ON TABLE telegram_auth_tokens IS 'Одноразовые токены для авторизации через Telegram (web ↔ bot)';
COMMENT ON COLUMN telegram_auth_tokens.token IS 'Уникальный токен (передаётся в deep link боту)';
COMMENT ON COLUMN telegram_auth_tokens.telegram_id IS 'ID пользователя в Telegram';
COMMENT ON COLUMN telegram_auth_tokens.user_id IS 'Пользователь (FK на users, NULL до завершения регистрации)';
COMMENT ON COLUMN telegram_auth_tokens.expires_at IS 'Когда токен истекает (обычно 5-10 минут)';
COMMENT ON COLUMN telegram_auth_tokens.used IS 'Был ли токен использован';
COMMENT ON COLUMN telegram_auth_tokens.created_at IS 'Когда токен был выпущен';

-- ====== STOCK ALERTS ======
COMMENT ON TABLE stock_alerts IS 'Уведомления о состоянии склада (для админа)';
COMMENT ON COLUMN stock_alerts.id IS 'Уникальный ID уведомления';
COMMENT ON COLUMN stock_alerts.product_id IS 'Товар (FK на products)';
COMMENT ON COLUMN stock_alerts.alert_type IS 'Тип: low_stock (мало) или out_of_stock (нет в наличии)';
COMMENT ON COLUMN stock_alerts.acknowledged IS 'Просмотрено ли админом';
COMMENT ON COLUMN stock_alerts.created_at IS 'Когда уведомление создано';

-- ====== PRODUCT RECOMMENDATIONS ======
COMMENT ON TABLE product_recommendations IS 'Связи между товарами для блока "Вам также может понравиться"';
COMMENT ON COLUMN product_recommendations.id IS 'Уникальный ID связи';
COMMENT ON COLUMN product_recommendations.product_id IS 'Основной товар';
COMMENT ON COLUMN product_recommendations.recommended_product_id IS 'Рекомендуемый товар';
COMMENT ON COLUMN product_recommendations.sort_order IS 'Порядок отображения рекомендации';
COMMENT ON COLUMN product_recommendations.created_at IS 'Когда связь создана';

-- ====== SITE CONFIG ======
COMMENT ON TABLE site_config IS 'Конфигурация сайта (хедер, hero, главная страница и т.д.)';
COMMENT ON COLUMN site_config.key IS 'Ключ настройки (например: homepage_hero, current_season)';
COMMENT ON COLUMN site_config.value IS 'Значение настройки в JSON формате';
COMMENT ON COLUMN site_config.updated_at IS 'Дата последнего изменения';

-- ====== CARE GUIDES ======
COMMENT ON TABLE care_guides IS 'Гайды по уходу за одеждой (страница /care)';
COMMENT ON COLUMN care_guides.id IS 'Уникальный ID гайда';
COMMENT ON COLUMN care_guides.title IS 'Заголовок гайда';
COMMENT ON COLUMN care_guides.description IS 'Описание';
COMMENT ON COLUMN care_guides.tips IS 'Советы по уходу (текст)';
COMMENT ON COLUMN care_guides.image IS 'Изображение к гайду';
COMMENT ON COLUMN care_guides.care_symbols IS 'Символы ухода (JSON массив, 15 SVG символов)';
COMMENT ON COLUMN care_guides.sort_order IS 'Порядок отображения';
COMMENT ON COLUMN care_guides.active IS 'Опубликован ли гайд';
COMMENT ON COLUMN care_guides.created_at IS 'Дата создания';
COMMENT ON COLUMN care_guides.updated_at IS 'Дата последнего изменения';
