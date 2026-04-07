package com.reinasleo.api.controller;

import com.reinasleo.api.dto.*;
import com.reinasleo.api.model.BotVisit;
import com.reinasleo.api.repository.BotVisitRepository;
import com.reinasleo.api.service.BotAuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@RestController
@RequestMapping("/api/bot")
public class BotController {

    private final BotAuthService botAuthService;
    private final BotVisitRepository botVisitRepository;

    @Value("${app.bot.api-secret}")
    private String botApiSecret;

    public BotController(BotAuthService botAuthService, BotVisitRepository botVisitRepository) {
        this.botAuthService = botAuthService;
        this.botVisitRepository = botVisitRepository;
    }

    private void validateSecret(String secret) {
        if (secret == null || !MessageDigest.isEqual(
                secret.getBytes(StandardCharsets.UTF_8),
                botApiSecret.getBytes(StandardCharsets.UTF_8))) {
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

    @PostMapping("/visit")
    public ResponseEntity<Void> logVisit(
            @RequestHeader("X-Bot-Secret") String secret,
            @Valid @RequestBody BotVisitRequest request) {
        validateSecret(secret);
        botVisitRepository.save(new BotVisit(
                request.telegramId(),
                request.username(),
                request.firstName(),
                request.lastName(),
                request.languageCode(),
                request.source()
        ));
        return ResponseEntity.ok().build();
    }
}
