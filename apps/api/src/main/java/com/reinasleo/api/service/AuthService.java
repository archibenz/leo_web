package com.reinasleo.api.service;

import com.reinasleo.api.dto.LoginRequest;
import com.reinasleo.api.dto.LoginResponse;
import com.reinasleo.api.dto.RegisterRequest;
import com.reinasleo.api.exception.EmailAlreadyExistsException;
import com.reinasleo.api.exception.InvalidCredentialsException;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.UserRepository;
import com.reinasleo.api.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public LoginResponse register(RegisterRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase();

        // Check email uniqueness
        userRepository.findByEmailIgnoreCase(normalizedEmail).ifPresent(existing -> {
            throw new EmailAlreadyExistsException(normalizedEmail);
        });

        if (request.privacyAccepted() == null || !request.privacyAccepted()) {
            throw new IllegalArgumentException("Privacy policy must be accepted");
        }

        String hash = passwordEncoder.encode(request.password());
        User user = new User(
                normalizedEmail,
                request.firstName().trim(),
                request.surname() != null ? request.surname().trim() : null,
                hash,
                request.dateOfBirth(),
                request.newsletter(),
                request.privacyAccepted()
        );
        User saved = userRepository.save(user);

        // Auto-login: generate token immediately
        String token = jwtService.generateToken(saved.getId(), saved.getEmail());
        return new LoginResponse(token, saved.getId(), saved.getEmail(), saved.getName(), saved.getSurname(), saved.getRole());
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase();

        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(InvalidCredentialsException::new);

        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        String token = jwtService.generateToken(user.getId(), user.getEmail());
        return new LoginResponse(token, user.getId(), user.getEmail(), user.getName(), user.getSurname(), user.getRole());
    }
}
