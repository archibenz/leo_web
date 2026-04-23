package com.reinasleo.api.service;

import com.reinasleo.api.dto.*;
import com.reinasleo.api.exception.TokenAlreadyConsumedException;
import com.reinasleo.api.model.TelegramAuthToken;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.TelegramAuthTokenRepository;
import com.reinasleo.api.repository.UserRepository;
import com.reinasleo.api.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.UUID;

@Service
public class BotAuthService {

    private final TelegramAuthTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final JwtService jwtService;

    @Value("${app.bot.username}")
    private String botUsername;

    public BotAuthService(TelegramAuthTokenRepository tokenRepository,
                          UserRepository userRepository,
                          JwtService jwtService) {
        this.tokenRepository = tokenRepository;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    @Transactional
    public TelegramInitResponse initAuth() {
        String authToken = UUID.randomUUID().toString().replace("-", "");
        // Temporary placeholder — telegramId not known yet; use 0 as sentinel
        TelegramAuthToken entry = new TelegramAuthToken(
                authToken,
                0L,
                Instant.now().plusSeconds(600)
        );
        tokenRepository.save(entry);
        String deepLink = "https://t.me/" + botUsername + "?start=auth_" + authToken;
        return new TelegramInitResponse(authToken, deepLink);
    }

    @Transactional
    public BotAuthResponse botLogin(Long telegramId, String authToken) {
        TelegramAuthToken entry = tokenRepository.findByTokenAndUsedFalse(authToken)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "auth_token_not_found"));

        if (entry.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.GONE, "auth_token_expired");
        }

        User user = userRepository.findByTelegramId(telegramId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user_not_found"));

        String loginToken = UUID.randomUUID().toString().replace("-", "");
        TelegramAuthToken loginEntry = new TelegramAuthToken(
                loginToken,
                telegramId,
                Instant.now().plusSeconds(600)
        );
        loginEntry.setUserId(user.getId());
        tokenRepository.save(loginEntry);

        entry.setUserId(user.getId());
        entry.markUsed();
        tokenRepository.save(entry);

        return new BotAuthResponse(loginToken);
    }

    @Transactional
    public BotAuthResponse botRegister(Long telegramId, String phone, String firstName, String surname, String authToken) {
        TelegramAuthToken entry = tokenRepository.findByTokenAndUsedFalse(authToken)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "auth_token_not_found"));

        if (entry.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.GONE, "auth_token_expired");
        }

        // Idempotent: if user already registered via TG
        User user = userRepository.findByTelegramId(telegramId).orElseGet(() -> {
            String name = firstName != null ? firstName.trim() : "User";
            User newUser = new User(telegramId, phone, name);
            if (surname != null && !surname.isBlank()) {
                newUser.setSurname(surname.trim());
            }
            return userRepository.save(newUser);
        });

        String loginToken = UUID.randomUUID().toString().replace("-", "");
        TelegramAuthToken loginEntry = new TelegramAuthToken(
                loginToken,
                telegramId,
                Instant.now().plusSeconds(600)
        );
        loginEntry.setUserId(user.getId());
        tokenRepository.save(loginEntry);

        entry.setUserId(user.getId());
        entry.markUsed();
        tokenRepository.save(entry);

        return new BotAuthResponse(loginToken);
    }

    @Transactional
    public LoginResponse pollAuth(String initToken) {
        TelegramAuthToken entry = tokenRepository.findById(initToken)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "token_not_found"));

        if (entry.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.GONE, "token_expired");
        }

        if (!entry.isUsed() || entry.getUserId() == null) {
            throw new ResponseStatusException(HttpStatus.ACCEPTED, "pending");
        }

        UUID userId = entry.getUserId();
        int claimed = tokenRepository.deleteIfClaimed(initToken);
        if (claimed == 0) {
            throw new TokenAlreadyConsumedException();
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user_not_found"));

        String jwt = jwtService.generateToken(user.getId(), user.getEmail());
        return new LoginResponse(jwt, user.getId(), user.getEmail(), user.getName(), user.getSurname(), user.getRole());
    }

    @Transactional(readOnly = true)
    public BotCheckUserResponse checkUser(Long telegramId) {
        return userRepository.findByTelegramId(telegramId)
                .map(user -> new BotCheckUserResponse(true, user.getFullName()))
                .orElse(new BotCheckUserResponse(false, null));
    }

    @Transactional
    public void botOrganicRegister(Long telegramId, String phone, String firstName, String surname) {
        if (userRepository.findByTelegramId(telegramId).isPresent()) {
            return;
        }

        String name = firstName != null ? firstName.trim() : "User";
        User newUser = new User(telegramId, phone, name);
        if (surname != null && !surname.isBlank()) {
            newUser.setSurname(surname.trim());
        }
        userRepository.save(newUser);
    }

    @Transactional
    public LoginResponse exchangeToken(String loginToken) {
        int claimed = tokenRepository.markUsedIfAvailable(loginToken);
        if (claimed == 0) {
            throw new TokenAlreadyConsumedException();
        }

        TelegramAuthToken entry = tokenRepository.findById(loginToken)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "login_token_not_found"));

        if (entry.getUserId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "token_has_no_user");
        }

        User user = userRepository.findById(entry.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user_not_found"));

        String jwt = jwtService.generateToken(user.getId(), user.getEmail());
        return new LoginResponse(jwt, user.getId(), user.getEmail(), user.getName(), user.getSurname(), user.getRole());
    }
}
