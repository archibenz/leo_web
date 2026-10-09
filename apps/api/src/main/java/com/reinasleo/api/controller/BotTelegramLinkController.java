package com.reinasleo.api.controller;

import com.reinasleo.api.dto.BotTelegramLinkConfirmRequest;
import com.reinasleo.api.exception.UnauthorizedException;
import com.reinasleo.api.service.TelegramIdentityService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@RestController
public class BotTelegramLinkController {
    private final TelegramIdentityService identities;
    private final byte[] secret;

    public BotTelegramLinkController(TelegramIdentityService identities,
                                    @Value("$" + "{app.bot.api-secret}") String secret) {
        if (secret == null || secret.isBlank()) throw new IllegalStateException("Bot API secret is required");
        this.identities = identities;
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    @PostMapping("/api/bot/telegram-link/confirm")
    public ResponseEntity<Void> confirm(@RequestHeader(value = "X-Bot-Secret", required = false) String provided,
                                       @Valid @RequestBody BotTelegramLinkConfirmRequest request) {
        if (provided == null || !MessageDigest.isEqual(secret, provided.getBytes(StandardCharsets.UTF_8))) {
            throw new UnauthorizedException("bot_secret_required");
        }
        identities.confirm(request);
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }
}
