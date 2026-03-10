package com.reinasleo.api.controller;

import com.reinasleo.api.dto.*;
import com.reinasleo.api.exception.EmailAlreadyExistsException;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.UserRepository;
import com.reinasleo.api.service.AuthService;
import com.reinasleo.api.service.VerificationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final VerificationService verificationService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(AuthService authService, VerificationService verificationService,
                          UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.authService = authService;
        this.verificationService = verificationService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/send-code")
    public ResponseEntity<Map<String, String>> sendCode(@Valid @RequestBody SendCodeRequest request) {
        verificationService.sendCode(request.email());
        return ResponseEntity.ok(Map.of("message", "Verification code sent"));
    }

    @PostMapping("/register")
    public ResponseEntity<LoginResponse> register(@Valid @RequestBody RegisterRequest request) {
        LoginResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(new UserResponse(
                user.getId(), user.getEmail(), user.getName(),
                user.getSurname(), user.getDateOfBirth(), user.getCreatedAt(), user.getRole()));
    }

    @PostMapping("/link-email")
    public ResponseEntity<Map<String, String>> linkEmail(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody LinkEmailRequest request) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "email_already_linked");
        }
        String normalizedEmail = request.email().trim().toLowerCase();

        // Verify the code first
        verificationService.verifyCode(normalizedEmail, request.code());

        userRepository.findByEmailIgnoreCase(normalizedEmail).ifPresent(existing -> {
            throw new EmailAlreadyExistsException(normalizedEmail);
        });
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "email_linked"));
    }
}
