package com.reinasleo.api.service;

import com.reinasleo.api.dto.AccountExportResponse;
import com.reinasleo.api.dto.CartExportDto;
import com.reinasleo.api.dto.CartItemExportDto;
import com.reinasleo.api.dto.DeleteAccountRequest;
import com.reinasleo.api.dto.FavoriteExportDto;
import com.reinasleo.api.dto.LoginRequest;
import com.reinasleo.api.dto.LoginResponse;
import com.reinasleo.api.dto.OrderExportDto;
import com.reinasleo.api.dto.OrderItemExportDto;
import com.reinasleo.api.dto.ProductInterestEventExportDto;
import com.reinasleo.api.dto.RegisterRequest;
import com.reinasleo.api.dto.UserExportDto;
import com.reinasleo.api.exception.BadRequestException;
import com.reinasleo.api.exception.ConflictException;
import com.reinasleo.api.exception.EmailAlreadyExistsException;
import com.reinasleo.api.exception.InvalidCredentialsException;
import com.reinasleo.api.model.Cart;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.CartItemRepository;
import com.reinasleo.api.repository.CartRepository;
import com.reinasleo.api.repository.FavoriteRepository;
import com.reinasleo.api.repository.OrderRepository;
import com.reinasleo.api.repository.ProductInterestEventRepository;
import com.reinasleo.api.repository.UserRepository;
import com.reinasleo.api.repository.VerificationCodeRepository;
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
import java.util.Collections;
import java.util.HexFormat;
import java.util.List;

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
    private final OrderRepository orderRepository;
    private final VerificationCodeRepository verificationCodeRepository;
    private final ProductInterestEventRepository productInterestEventRepository;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       JwtService jwtService, VerificationService verificationService,
                       DeleteChallengeService deleteChallengeService,
                       CartItemRepository cartItemRepository,
                       CartRepository cartRepository,
                       FavoriteRepository favoriteRepository,
                       OrderRepository orderRepository,
                       VerificationCodeRepository verificationCodeRepository,
                       ProductInterestEventRepository productInterestEventRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.verificationService = verificationService;
        this.deleteChallengeService = deleteChallengeService;
        this.cartItemRepository = cartItemRepository;
        this.cartRepository = cartRepository;
        this.favoriteRepository = favoriteRepository;
        this.orderRepository = orderRepository;
        this.verificationCodeRepository = verificationCodeRepository;
        this.productInterestEventRepository = productInterestEventRepository;
    }

    @Transactional
    public void issueDeleteChallenge(User user) {
        if (user == null) {
            throw new InvalidCredentialsException();
        }
        if (user.getTelegramId() == null) {
            throw new ConflictException("challenge_not_supported");
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
            throw new BadRequestException("privacy_required");
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
            throw new BadRequestException("confirmation_mismatch");
        }

        String credential = request.credential();
        String method;
        if (user.getPasswordHash() != null) {
            if (credential == null || credential.isEmpty()
                    || !passwordEncoder.matches(credential, user.getPasswordHash())) {
                throw new InvalidCredentialsException();
            }
            method = "password";
        } else if (user.getTelegramId() != null) {
            // R8: для TG-only требуем одноразовый код из telegram_delete_challenges.
            // Старый fallback (credential = telegramId) убран: ID статичен и
            // утекает в URL некоторых клиентов, что слабый секрет.
            String provided = credential == null ? "" : credential.trim();
            if (!deleteChallengeService.consumeCode(user.getTelegramId(), provided)) {
                throw new InvalidCredentialsException();
            }
            method = "telegram_code";
        } else {
            // account has neither password nor telegramId — should never happen,
            // but we still let the operation proceed because there is nothing to verify.
            method = "none";
        }

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

        log.atInfo()
                .addKeyValue("event", "account_deleted")
                .addKeyValue("user_id", user.getId())
                .addKeyValue("method", method)
                .addKeyValue("legacy_email_hash", legacyEmailHash)
                .addKeyValue("cart_items_removed", removedItems)
                .addKeyValue("favorites_removed", removedFavorites)
                .addKeyValue("carts_removed", removedCarts)
                .log("account deletion completed");
    }

    /**
     * GDPR Art.20 — right to data portability.
     *
     * <p>Aggregates all user-owned data into a single machine-readable response:
     * profile fields, orders + items, cart + items, favorites, behavioural
     * product-interest events, and a count of verification codes ever issued.
     * Projects entities into DTOs inside this transaction (open-in-view: false)
     * so lazy relations stay safe.</p>
     */
    @Transactional(readOnly = true)
    public AccountExportResponse exportAccountData(User user) {
        if (user == null) {
            throw new InvalidCredentialsException();
        }

        UserExportDto userDto = new UserExportDto(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getSurname(),
                user.getPhone(),
                user.getDateOfBirth(),
                user.getTelegramId(),
                user.isNewsletter(),
                user.isNewsletterPromos(),
                user.isNewsletterCollections(),
                user.isNewsletterProjects(),
                user.isPrivacyAccepted(),
                user.getRole(),
                user.getCreatedAt(),
                user.getUpdatedAt(),
                user.getPasswordHash() != null,
                user.getTelegramId() != null
        );

        List<OrderExportDto> orders = orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(order -> {
                    List<OrderItemExportDto> items = order.getItems().stream()
                            .map(it -> new OrderItemExportDto(
                                    it.getProduct().getId(),
                                    it.getProduct().getTitle(),
                                    it.getSize(),
                                    it.getQuantity(),
                                    it.getPrice()))
                            .toList();
                    return new OrderExportDto(
                            order.getId(),
                            order.getStatus(),
                            order.getTotal(),
                            items,
                            order.getCreatedAt(),
                            order.getUpdatedAt());
                })
                .toList();

        Cart cart = cartRepository.findByUserId(user.getId()).orElse(null);
        CartExportDto cartDto;
        if (cart == null) {
            cartDto = new CartExportDto(Collections.emptyList(), null, null);
        } else {
            List<CartItemExportDto> cartItems = cart.getItems().stream()
                    .map(ci -> new CartItemExportDto(
                            ci.getProduct().getId(),
                            ci.getProduct().getTitle(),
                            ci.getProduct().getPrice(),
                            ci.getSize(),
                            ci.getQuantity(),
                            ci.getCreatedAt()))
                    .toList();
            cartDto = new CartExportDto(cartItems, cart.getCreatedAt(), cart.getUpdatedAt());
        }

        List<FavoriteExportDto> favorites = favoriteRepository.findByUserId(user.getId()).stream()
                .map(fav -> new FavoriteExportDto(
                        fav.getProduct().getId(),
                        fav.getProduct().getTitle(),
                        fav.getProduct().getPrice(),
                        fav.getCreatedAt()))
                .toList();

        // FK is ON DELETE SET NULL, so anonymised post-deletion rows drop out here.
        List<ProductInterestEventExportDto> productInterestEvents =
                productInterestEventRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                        .map(e -> new ProductInterestEventExportDto(
                                e.getProduct().getId(),
                                e.getProduct().getTitle(),
                                e.getEventType(),
                                e.getCreatedAt()))
                        .toList();

        long verificationCodesIssued = user.getEmail() == null
                ? 0L
                : verificationCodeRepository.countByEmail(user.getEmail().trim().toLowerCase());

        log.atInfo()
                .addKeyValue("event", "account_exported")
                .addKeyValue("user_id", user.getId())
                .addKeyValue("orders_count", orders.size())
                .addKeyValue("favorites_count", favorites.size())
                .addKeyValue("cart_items_count", cartDto.items().size())
                .addKeyValue("product_interest_events_count", productInterestEvents.size())
                .log("account data exported");

        return new AccountExportResponse(
                userDto, orders, cartDto, favorites, productInterestEvents,
                verificationCodesIssued, Instant.now());
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
