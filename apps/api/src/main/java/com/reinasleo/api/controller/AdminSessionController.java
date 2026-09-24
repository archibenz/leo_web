package com.reinasleo.api.controller;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Дверь дашборда аналитики (reinasleo.com/analytics). nginx спрашивает эту
 * ручку подзапросом auth_request на каждый запрос к дашборду и его API и
 * пересылает куки браузера: 204 — пускать, 403 — нет.
 *
 * Тела нет, и проверки здесь тоже нет — нарочно. Ручка лежит под
 * /api/admin/**, то есть за hasAuthority("ROLE_ADMIN") в SecurityConfig, а
 * роль ставит JwtAuthFilter после проверки подписи и срока токена и чтения
 * ЖИВОЙ учётки (findActiveById). Удалённый или разжалованный администратор
 * отбивается сразу, а не когда истечёт токен, — ради этого дверь и держит
 * сайт, а не аналитика с копией секрета JWT.
 *
 * no-store: ответ про конкретную сессию, кэшировать его по дороге нельзя.
 */
@RestController
public class AdminSessionController {

    @GetMapping("/api/admin/session")
    public ResponseEntity<Void> session() {
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }
}
