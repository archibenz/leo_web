package com.reinasleo.api.service;

import com.reinasleo.api.dto.DeleteAccountRequest;
import com.reinasleo.api.dto.LoginRequest;
import com.reinasleo.api.dto.LoginResponse;
import com.reinasleo.api.dto.RegisterRequest;
import com.reinasleo.api.exception.EmailAlreadyExistsException;
import com.reinasleo.api.exception.InvalidCredentialsException;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.CartItemRepository;
import com.reinasleo.api.repository.CartRepository;
import com.reinasleo.api.repository.FavoriteRepository;
import com.reinasleo.api.repository.UserRepository;
import com.reinasleo.api.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private static final String DELETE_CONFIRMATION_TOKEN = "DELETE";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final VerificationService verificationService;
    private final DeleteChallengeService deleteChallengeService;
    private final CartItemRepository cartItemRepository;
    private final CartRepository cartRepository;
    private final FavoriteRepository favoriteRepository;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       JwtService jwtService, VerificationService verificationService,
                       DeleteChallengeService deleteChallengeService,
                       CartItemRepository cartItemRepository,
                       CartRepository cartRepository,
                       FavoriteRepository favoriteRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.verificationService = verificationService;
        this.deleteChallengeService = deleteChallengeService;
        this.cartItemRepository = cartItemRepository;
        this.cartRepository = cartRepository;
        this.favoriteRepository = favoriteRepository;
    }

    @Transactional
    public void issueDeleteChallenge(User user) {
        if (user == null) {
            throw new InvalidCredentialsException();
        }
        if (user.getTelegramId() == null) {
            throw new IllegalArgumentException("challenge_not_supported");
        }
        deleteChallengeService.issueChallenge(user.getTelegramId());
    }

    @Transactional
    public LoginResponse register(RegisterRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase();

        // Verify email code
        verificationService.verifyCode(normalizedEmail, request.code());

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
        user.setNewsletterPromos(request.newsletterPromos());
        user.setNewsletterCollections(request.newsletterCollections());
        user.setNewsletterProjects(request.newsletterProjects());

        User saved = userRepository.save(user);

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

    /**
     * R1 + R8: soft-delete user (GDPR Art.17 / 152-ФЗ).
     *
     * <p>Anonymizes PII in-place, sets {@code deleted_at}, keeps the row so
     * {@code orders} retain referential integrity for legal/accounting
     * (V19 enforces ON DELETE RESTRICT). After this call:</p>
     * <ul>
     *   <li>email is reassigned to {@code deleted-<uuid>@deleted.local} (preserves unique index);</li>
     *   <li>name/surname/phone/dateOfBirth/passwordHash/telegramId become NULL;</li>
     *   <li>name is set to "deleted" because the column is NOT NULL;</li>
     *   <li>cart, cart_items and favorites are wiped (behavioural fingerprint, quasi-PII).</li>
     * </ul>
     *
     * <p>Repository lookups (login, /me, telegram) skip rows with {@code deleted_at IS NOT NULL},
     * so any previously issued JWT is rejected on next request.</p>
     */
    @Transactional
    public void deleteAccount(User user, DeleteAccountRequest request) {
        if (user == null) {
            throw new InvalidCredentialsException();
        }
        if (request == null || request.confirmation() == null
                || !constantTimeEquals(request.confirmation(), DELETE_CONFIRMATION_TOKEN)) {
            throw new IllegalArgumentException("confirmation_mismatch");
        }

        String credential = request.credential();
        if (user.getPasswordHash() != null) {
            if (credential == null || credential.isEmpty()
                    || !passwordEncoder.matches(credential, user.getPasswordHash())) {
                throw new InvalidCredentialsException();
            }
        } else if (user.getTelegramId() != null) {
            // R8: для TG-only требуем одноразовый код из telegram_delete_challenges.
            // Старый fallback (credential = telegramId) убран: ID статичен и
            // утекает в URL некоторых клиентов, что слабый секрет.
            String provided = credential == null ? "" : credential.trim();
            if (!deleteChallengeService.consumeCode(user.getTelegramId(), provided)) {
                throw new InvalidCredentialsException();
            }
        }
        // else: account has neither password nor telegramId — should never happen,
        // but we still let the operation proceed because there is nothing to verify.

        String legacyEmailHash = user.getEmail() == null ? "n/a" : sha256Hex(user.getEmail());

        user.setEmail("deleted-" + user.getId() + "@deleted.local");
        user.setName("deleted");
        user.setSurname(null);
        user.setPhone(null);
        user.setDateOfBirth(null);
        user.setPasswordHash(null);
        user.setTelegramId(null);
        user.setNewsletterPromos(false);
        user.setNewsletterCollections(false);
        user.setNewsletterProjects(false);
        user.setDeletedAt(Instant.now());

        userRepository.save(user);

        // Cart и favorites — поведенческие данные (GDPR Art.4(1) квази-PII).
        // Удаляем полностью; orders остаются для legal/accounting (V19 RESTRICT).
        int removedItems = cartItemRepository.deleteAllByUserId(user.getId());
        int removedFavorites = favoriteRepository.deleteAllByUserId(user.getId());
        int removedCarts = cartRepository.deleteByUserId(user.getId());

        log.info("account_deleted user_id={} legacy_email_hash={} cart_items={} favorites={} carts={}",
                user.getId(), legacyEmailHash, removedItems, removedFavorites, removedCarts);
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        byte[] aBytes = a.getBytes(StandardCharsets.UTF_8);
        byte[] bBytes = b.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(aBytes, bBytes);
    }

    private static String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            return "sha256_unavailable";
        }
    }
}
