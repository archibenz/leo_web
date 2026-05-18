package com.reinasleo.api.controller;

import com.reinasleo.api.dto.LoginResponse;
import com.reinasleo.api.dto.PollAuthResponse;
import com.reinasleo.api.dto.TelegramInitResponse;
import com.reinasleo.api.service.BotAuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth/telegram")
public class TelegramAuthController {

    private static final Logger log = LoggerFactory.getLogger(TelegramAuthController.class);
    private static final String BEARER_PREFIX = "Bearer ";

    private final BotAuthService botAuthService;

    public TelegramAuthController(BotAuthService botAuthService) {
        this.botAuthService = botAuthService;
    }

    @PostMapping("/init")
    public ResponseEntity<TelegramInitResponse> init() {
        return ResponseEntity.ok(botAuthService.initAuth());
    }

    @GetMapping("/exchange")
    public ResponseEntity<LoginResponse> exchange(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "token", required = false) String queryToken) {
        String token = resolveToken("exchange", authorization, queryToken);
        return ResponseEntity.ok(botAuthService.exchangeToken(token));
    }

    @GetMapping("/poll")
    public ResponseEntity<PollAuthResponse> poll(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "token", required = false) String queryToken) {
        String token = resolveToken("poll", authorization, queryToken);
        return ResponseEntity.ok(botAuthService.pollAuth(token));
    }

    // Header form is preferred — query-string tokens leak into nginx access logs
    // and browser history. Query param accepted for one release cycle to keep
    // the existing web client working; will be removed after frontend migration.
    private String resolveToken(String endpoint, String authorization, String queryToken) {
        if (authorization != null && authorization.startsWith(BEARER_PREFIX)) {
            String headerToken = authorization.substring(BEARER_PREFIX.length()).trim();
            if (!headerToken.isEmpty()) {
                return headerToken;
            }
        }
        if (queryToken != null && !queryToken.isBlank()) {
            log.warn("telegram/{} called with token in query string; client should migrate to "
                    + "Authorization: Bearer <token>", endpoint);
            return queryToken;
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "missing_token");
    }
}
