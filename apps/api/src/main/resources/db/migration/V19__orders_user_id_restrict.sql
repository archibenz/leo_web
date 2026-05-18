-- R8 CRITICAL-2.1: переключаем orders.user_id FK с CASCADE на RESTRICT.
-- V2 определил orders.user_id с ON DELETE CASCADE; в сочетании с soft-delete
-- из W3 (GDPR Art.17 / 152-ФЗ) это означает, что любой случайный hard
-- `DELETE FROM users` снёс бы legal-required orders. RESTRICT гарантирует,
-- что единственным каналом «удаления» юзера остаётся
-- AuthService.deleteAccount (анонимизация + deleted_at), а попытка hard
-- DELETE упадёт fast и заметно.

ALTER TABLE orders DROP CONSTRAINT orders_user_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

COMMENT ON CONSTRAINT orders_user_id_fkey ON orders IS
    'Orders retained for legal/accounting compliance — see AuthService.deleteAccount for the soft-delete + anonymize path';
