package com.reinasleo.api.controller;

import com.reinasleo.api.dto.LoginResponse;
import com.reinasleo.api.dto.PollAuthResponse;
import com.reinasleo.api.dto.TelegramInitResponse;
import com.reinasleo.api.security.AuthCookies;
import com.reinasleo.api.service.BotAuthService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth/telegram")
public class TelegramAuthController {

    private static final String BEARER_PREFIX = "Bearer ";

    private final BotAuthService botAuthService;
    private final AuthCookies authCookies;

    public TelegramAuthController(BotAuthService botAuthService, AuthCookies authCookies) {
        this.botAuthService = botAuthService;
        this.authCookies = authCookies;
    }

    @PostMapping("/init")
    public ResponseEntity<TelegramInitResponse> init() {
        return ResponseEntity.ok(botAuthService.initAuth());
    }

    @GetMapping("/exchange")
    public ResponseEntity<LoginResponse> exchange(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            HttpServletResponse httpResponse) {
        LoginResponse response = botAuthService.exchangeToken(extractBearer(authorization));
        authCookies.issue(httpResponse, response.token());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/poll")
    public ResponseEntity<PollAuthResponse> poll(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            HttpServletResponse httpResponse) {
        PollAuthResponse response = botAuthService.pollAuth(extractBearer(authorization));
        if (response.token() != null) {
            authCookies.issue(httpResponse, response.token());
        }
        return ResponseEntity.ok(response);
    }

    private String extractBearer(String authorization) {
        if (authorization != null && authorization.startsWith(BEARER_PREFIX)) {
            String token = authorization.substring(BEARER_PREFIX.length()).trim();
            if (!token.isEmpty()) {
                return token;
            }
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "missing_token");
    }
}
