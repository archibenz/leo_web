package com.reinasleo.api.controller;

import com.reinasleo.api.dto.ClientErrorBatchRequest;
import com.reinasleo.api.errors.AppErrorCollector;
import com.reinasleo.api.errors.ClientErrorLimiter;
import com.reinasleo.api.errors.SecretMask;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Set;

/**
 * Ошибки веба → AppErrorCollector → аналитика (app_error). Шлют сюда браузер
 * (window.onerror, unhandledrejection, error.tsx — пачкой через sendBeacon) и
 * серверный рендер Next (instrumentation.ts → onRequestError).
 *
 * КТО ПРИСЛАЛ — решает сервер, не тело. Next ходит сюда напрямую по loopback
 * (API_BASE_INTERNAL), без nginx, и значит без X-Real-IP — такой запрос
 * помечается site-web-server. Всё, что пришло через nginx, — браузер
 * (site-web-client), что бы ни было написано в теле.
 *
 * Без входа (sendBeacon не несёт заголовков), поэтому лимит — ClientErrorLimiter,
 * пачка ≤20 событий и ≤16 КБ. Ответ пустой.
 */
@RestController
@RequestMapping("/api/client-errors")
public class ClientErrorController {

    static final int MAX_BODY_BYTES = 16 * 1024;
    private static final Set<String> CLIENT_KINDS = Set.of("window_error", "unhandled_rejection", "render");
    private static final Set<String> SERVER_KINDS = Set.of("render");

    private final AppErrorCollector errors;
    private final ClientErrorLimiter limiter;

    public ClientErrorController(AppErrorCollector errors, ClientErrorLimiter limiter) {
        this.errors = errors;
        this.limiter = limiter;
    }

    @PostMapping
    public ResponseEntity<Void> submit(@Valid @RequestBody ClientErrorBatchRequest batch, HttpServletRequest request) {
        if (request.getContentLengthLong() > MAX_BODY_BYTES) {
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).build();
        }
        boolean fromNextServer = isLoopback(request.getRemoteAddr())
                && request.getHeader("X-Real-IP") == null
                && request.getHeader("X-Forwarded-For") == null;
        String ip = fromNextServer ? "next-server" : clientIp(request);
        if (!limiter.tryAcquire(ip)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).build();
        }

        String app = fromNextServer ? "site-web-server" : "site-web-client";
        Set<String> kinds = fromNextServer ? SERVER_KINDS : CLIENT_KINDS;
        Instant now = Instant.now();
        for (ClientErrorBatchRequest.Item e : batch.events()) {
            if (!kinds.contains(e.kind())) continue;
            List<String> frames = e.frames() == null ? List.of() : e.frames().stream()
                    .limit(10)
                    .map(f -> SecretMask.maskAndClip(f, 200))
                    .toList();
            errors.record(new AppErrorCollector.AppError(
                    app, e.kind(),
                    SecretMask.maskAndClip(e.errorClass() == null ? "Error" : e.errorClass(), 200),
                    SecretMask.maskAndClip(e.message() == null ? "" : e.message(), 500),
                    frames,
                    SecretMask.maskAndClip(e.route(), 300),
                    null, e.status(),
                    SecretMask.maskAndClip(e.release(), 60),
                    SecretMask.maskAndClip(e.browser(), 60),
                    e.count() == null ? 1 : e.count(), now, now));
        }
        return ResponseEntity.accepted().cacheControl(CacheControl.noStore()).build();
    }

    private static boolean isLoopback(String addr) {
        return "127.0.0.1".equals(addr) || "::1".equals(addr) || "0:0:0:0:0:0:0:1".equals(addr);
    }

    // Как в RateLimitFilter: X-Real-IP доверяем, только если запрос пришёл от
    // нашего nginx (с loopback); прямой запрос извне идёт по своему адресу.
    private static String clientIp(HttpServletRequest request) {
        String remote = request.getRemoteAddr();
        if (!isLoopback(remote)) return remote;
        String realIp = request.getHeader("X-Real-IP");
        return realIp != null && !realIp.isBlank() ? realIp.trim() : remote;
    }
}
