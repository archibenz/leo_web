package com.reinasleo.api.controller;

import com.reinasleo.api.dto.*;
import com.reinasleo.api.service.BotAuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/bot")
public class BotController {

    private final BotAuthService botAuthService;

    @Value("${app.bot.api-secret}")
    private String botApiSecret;

    public BotController(BotAuthService botAuthService) {
        this.botAuthService = botAuthService;
    }

    private void validateSecret(String secret) {
        if (secret == null || !secret.equals(botApiSecret)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_bot_secret");
        }
    }

    @PostMapping("/login")
    public ResponseEntity<BotAuthResponse> login(
            @RequestHeader("X-Bot-Secret") String secret,
            @Valid @RequestBody BotLoginRequest request) {
        validateSecret(secret);
        return ResponseEntity.ok(botAuthService.botLogin(request.telegramId(), request.authToken()));
    }

    @PostMapping("/register")
    public ResponseEntity<BotAuthResponse> register(
            @RequestHeader("X-Bot-Secret") String secret,
            @Valid @RequestBody BotRegisterRequest request) {
        validateSecret(secret);
        return ResponseEntity.ok(botAuthService.botRegister(
                request.telegramId(), request.phone(), request.firstName(),
                request.surname(), request.authToken()));
    }

    @PostMapping("/check-user")
    public ResponseEntity<BotCheckUserResponse> checkUser(
            @RequestHeader("X-Bot-Secret") String secret,
            @Valid @RequestBody BotCheckUserRequest request) {
        validateSecret(secret);
        return ResponseEntity.ok(botAuthService.checkUser(request.telegramId()));
    }

    @PostMapping("/organic-register")
    public ResponseEntity<Void> organicRegister(
            @RequestHeader("X-Bot-Secret") String secret,
            @Valid @RequestBody BotOrganicRegisterRequest request) {
        validateSecret(secret);
        botAuthService.botOrganicRegister(
                request.telegramId(), request.phone(), request.firstName(), request.surname());
        return ResponseEntity.ok().build();
    }
}
