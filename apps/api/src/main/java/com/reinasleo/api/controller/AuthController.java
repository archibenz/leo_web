package com.reinasleo.api.controller;

import com.reinasleo.api.dto.*;
import com.reinasleo.api.model.User;
import com.reinasleo.api.security.AuthCookies;
import com.reinasleo.api.service.AuthService;
import com.reinasleo.api.service.VerificationService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final VerificationService verificationService;
    private final AuthCookies authCookies;

    public AuthController(AuthService authService, VerificationService verificationService,
                          AuthCookies authCookies) {
        this.authService = authService;
        this.verificationService = verificationService;
        this.authCookies = authCookies;
    }

    @PostMapping("/send-code")
    public ResponseEntity<Map<String, String>> sendCode(@Valid @RequestBody SendCodeRequest request) {
        verificationService.sendCode(request.email());
        return ResponseEntity.ok(Map.of("message", "Verification code sent"));
    }

    @PostMapping("/register")
    public ResponseEntity<LoginResponse> register(@Valid @RequestBody RegisterRequest request,
                                                  HttpServletResponse httpResponse) {
        LoginResponse response = authService.register(request);
        authCookies.issue(httpResponse, response.token());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request,
                                               HttpServletResponse httpResponse) {
        LoginResponse response = authService.login(request);
        authCookies.issue(httpResponse, response.token());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse httpResponse) {
        authCookies.clear(httpResponse);
        return ResponseEntity.noContent().build();
    }

    // SecurityConfig protects all /api/auth/me/** with .authenticated(), so by
    // the time these handlers run @AuthenticationPrincipal User is guaranteed
    // non-null. Earlier null-checks were unreachable dead code that obscured
    // the security invariant — removed.

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(toUserResponse(user));
    }

    @PostMapping("/link-email")
    public ResponseEntity<UserResponse> linkEmail(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody LinkEmailRequest request) {
        User updated = authService.linkEmail(user, request);
        return ResponseEntity.ok(toUserResponse(updated));
    }

    @PutMapping("/newsletter-preferences")
    public ResponseEntity<UserResponse> updateNewsletterPreferences(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody NewsletterPreferencesRequest request) {
        User updated = authService.updateNewsletterPreferences(user, request);
        return ResponseEntity.ok(toUserResponse(updated));
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteMe(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody DeleteAccountRequest request,
            HttpServletResponse httpResponse) {
        authService.deleteAccount(user, request);
        authCookies.clear(httpResponse);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/me/delete-challenge")
    public ResponseEntity<Void> issueDeleteChallenge(@AuthenticationPrincipal User user) {
        authService.issueDeleteChallenge(user);
        return ResponseEntity.accepted().build();
    }

    @GetMapping("/me/export")
    public ResponseEntity<AccountExportResponse> exportMe(@AuthenticationPrincipal User user) {
        AccountExportResponse export = authService.exportAccountData(user);
        return ResponseEntity.ok(export);
    }

    private UserResponse toUserResponse(User user) {
        return new UserResponse(
                user.getId(), user.getEmail(), user.getName(),
                user.getSurname(), user.getDateOfBirth(), user.getCreatedAt(), user.getRole(),
                user.isNewsletterPromos(), user.isNewsletterCollections(), user.isNewsletterProjects(),
                user.getPasswordHash() != null, user.getTelegramId() != null);
    }
}
