package com.reinasleo.api.controller;

import com.reinasleo.api.dto.SiteEventBatchRequest;
import com.reinasleo.api.model.User;
import com.reinasleo.api.service.SiteEventService;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Публичная: sendBeacon с витрины не может нести Authorization-заголовок, так
// что "без авторизации" не значит "без личности" — @AuthenticationPrincipal
// разбирает Bearer ИЛИ rl_session cookie, если они есть (как в CheckoutController
// для гостевого чекаута). Ответ пустой: клиенту нечего знать о нашей базе.
@RestController
@RequestMapping("/api/events")
public class SiteEventController {

    private final SiteEventService siteEventService;

    public SiteEventController(SiteEventService siteEventService) {
        this.siteEventService = siteEventService;
    }

    @PostMapping
    public ResponseEntity<Void> submit(@Valid @RequestBody SiteEventBatchRequest request,
                                        @AuthenticationPrincipal User user) {
        siteEventService.recordBatch(request.events(), user);
        return ResponseEntity
                .accepted()
                .cacheControl(CacheControl.noStore())
                .build();
    }
}
