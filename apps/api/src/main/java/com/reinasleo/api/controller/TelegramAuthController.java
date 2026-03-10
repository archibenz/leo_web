package com.reinasleo.api.controller;

import com.reinasleo.api.dto.LoginResponse;
import com.reinasleo.api.dto.TelegramInitResponse;
import com.reinasleo.api.service.BotAuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth/telegram")
public class TelegramAuthController {

    private final BotAuthService botAuthService;

    public TelegramAuthController(BotAuthService botAuthService) {
        this.botAuthService = botAuthService;
    }

    @PostMapping("/init")
    public ResponseEntity<TelegramInitResponse> init() {
        return ResponseEntity.ok(botAuthService.initAuth());
    }

    @GetMapping("/exchange")
    public ResponseEntity<LoginResponse> exchange(@RequestParam String token) {
        return ResponseEntity.ok(botAuthService.exchangeToken(token));
    }
}
