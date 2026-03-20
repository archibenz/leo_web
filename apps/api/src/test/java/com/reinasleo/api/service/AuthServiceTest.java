package com.reinasleo.api.service;

import com.reinasleo.api.dto.LoginRequest;
import com.reinasleo.api.dto.LoginResponse;
import com.reinasleo.api.dto.RegisterRequest;
import com.reinasleo.api.exception.EmailAlreadyExistsException;
import com.reinasleo.api.exception.InvalidCredentialsException;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.UserRepository;
import com.reinasleo.api.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private VerificationService verificationService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, jwtService, verificationService);
    }

    private RegisterRequest validRegisterRequest() {
        return new RegisterRequest(
                "Test@Example.com", "123456", "John", "Doe",
                "password123", LocalDate.of(1990, 1, 1),
                true, false, false, false, true
        );
    }

    private User savedUser(String email) {
        User user = new User(email, "John", "Doe", "hashed", LocalDate.of(1990, 1, 1), true, true);
        try {
            var idField = User.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(user, UUID.randomUUID());
        } catch (Exception ignored) {}
        return user;
    }

    @Test
    void register_withNewEmail_succeeds() {
        doNothing().when(verificationService).verifyCode(anyString(), anyString());
        when(userRepository.findByEmailIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            var idField = User.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(u, UUID.randomUUID());
            return u;
        });
        when(jwtService.generateToken(any(UUID.class), anyString())).thenReturn("jwt-token");

        LoginResponse response = authService.register(validRegisterRequest());

        assertThat(response.token()).isEqualTo("jwt-token");
        assertThat(response.email()).isEqualTo("test@example.com");
        verify(verificationService).verifyCode("test@example.com", "123456");
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_withExistingEmail_throws() {
        doNothing().when(verificationService).verifyCode(anyString(), anyString());
        when(userRepository.findByEmailIgnoreCase("test@example.com"))
                .thenReturn(Optional.of(savedUser("test@example.com")));

        assertThatThrownBy(() -> authService.register(validRegisterRequest()))
                .isInstanceOf(EmailAlreadyExistsException.class);
    }

    @Test
    void register_withPrivacyNotAccepted_throws() {
        doNothing().when(verificationService).verifyCode(anyString(), anyString());
        when(userRepository.findByEmailIgnoreCase(anyString())).thenReturn(Optional.empty());

        RegisterRequest request = new RegisterRequest(
                "test@example.com", "123456", "John", "Doe",
                "password123", null, false, false, false, false, false
        );

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Privacy policy");
    }

    @Test
    void login_withCorrectCredentials_returnsToken() {
        User user = savedUser("test@example.com");
        when(userRepository.findByEmailIgnoreCase("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "hashed")).thenReturn(true);
        when(jwtService.generateToken(any(UUID.class), anyString())).thenReturn("jwt-token");

        LoginResponse response = authService.login(new LoginRequest("test@example.com", "password123"));

        assertThat(response.token()).isEqualTo("jwt-token");
    }

    @Test
    void login_withWrongPassword_throws() {
        User user = savedUser("test@example.com");
        when(userRepository.findByEmailIgnoreCase("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "hashed")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new LoginRequest("test@example.com", "wrong")))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void login_withNonExistentEmail_throws() {
        when(userRepository.findByEmailIgnoreCase("nobody@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginRequest("nobody@example.com", "password")))
                .isInstanceOf(InvalidCredentialsException.class);
    }
}
