package com.reinasleo.api.service;

import com.reinasleo.api.dto.DeleteAccountRequest;
import com.reinasleo.api.exception.BadRequestException;
import com.reinasleo.api.exception.ConflictException;
import com.reinasleo.api.exception.InvalidCredentialsException;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.CartItemRepository;
import com.reinasleo.api.repository.CartRepository;
import com.reinasleo.api.repository.FavoriteRepository;
import com.reinasleo.api.repository.OrderRepository;
import com.reinasleo.api.repository.ProductInterestEventRepository;
import com.reinasleo.api.repository.UserRepository;
import com.reinasleo.api.repository.VerificationCodeRepository;
import com.reinasleo.api.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceDeleteTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private VerificationService verificationService;
    @Mock private DeleteChallengeService deleteChallengeService;
    @Mock private CartItemRepository cartItemRepository;
    @Mock private CartRepository cartRepository;
    @Mock private FavoriteRepository favoriteRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private VerificationCodeRepository verificationCodeRepository;
    @Mock private ProductInterestEventRepository productInterestEventRepository;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, jwtService,
                verificationService, deleteChallengeService,
                cartItemRepository, cartRepository, favoriteRepository,
                orderRepository, verificationCodeRepository, productInterestEventRepository);
    }

    private static User emailUser() {
        User user = new User("alice@example.com", "Alice", "Smith",
                "hashed-pw", LocalDate.of(1990, 1, 1), true, true);
        setId(user, UUID.randomUUID());
        return user;
    }

    private static User telegramUser(long telegramId) {
        User user = new User(telegramId, "+71234567890", "Bob");
        setId(user, UUID.randomUUID());
        return user;
    }

    private static void setId(User user, UUID id) {
        try {
            var field = User.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(user, id);
        } catch (Exception ignored) {}
    }

    @Test
    void deleteAccount_emailUser_softDeletesAndAnonymizesPii() {
        User user = emailUser();
        UUID userId = user.getId();
        when(passwordEncoder.matches("correct-pw", "hashed-pw")).thenReturn(true);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        authService.deleteAccount(user, new DeleteAccountRequest("correct-pw", "DELETE"));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertThat(saved.getDeletedAt()).isNotNull();
        assertThat(saved.getEmail()).isEqualTo("deleted-" + userId + "@deleted.local");
        assertThat(saved.getName()).isEqualTo("deleted");
        assertThat(saved.getSurname()).isNull();
        assertThat(saved.getPhone()).isNull();
        assertThat(saved.getDateOfBirth()).isNull();
        assertThat(saved.getPasswordHash()).isNull();
        assertThat(saved.getTelegramId()).isNull();
        assertThat(saved.isNewsletterPromos()).isFalse();
        assertThat(saved.isNewsletterCollections()).isFalse();
        assertThat(saved.isNewsletterProjects()).isFalse();
    }

    @Test
    void deleteAccount_alsoWipesCartAndFavorites() {
        User user = emailUser();
        UUID userId = user.getId();
        when(passwordEncoder.matches("correct-pw", "hashed-pw")).thenReturn(true);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        authService.deleteAccount(user, new DeleteAccountRequest("correct-pw", "DELETE"));

        verify(cartItemRepository).deleteAllByUserId(userId);
        verify(favoriteRepository).deleteAllByUserId(userId);
        verify(cartRepository).deleteByUserId(userId);
    }

    @Test
    void deleteAccount_wrongPassword_throwsInvalidCredentialsAndDoesNotSave() {
        User user = emailUser();
        when(passwordEncoder.matches("wrong-pw", "hashed-pw")).thenReturn(false);

        assertThatThrownBy(() -> authService.deleteAccount(user, new DeleteAccountRequest("wrong-pw", "DELETE")))
                .isInstanceOf(InvalidCredentialsException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void deleteAccount_missingPassword_throwsInvalidCredentials() {
        User user = emailUser();

        assertThatThrownBy(() -> authService.deleteAccount(user, new DeleteAccountRequest(null, "DELETE")))
                .isInstanceOf(InvalidCredentialsException.class);
        assertThatThrownBy(() -> authService.deleteAccount(user, new DeleteAccountRequest("", "DELETE")))
                .isInstanceOf(InvalidCredentialsException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void deleteAccount_wrongConfirmation_throwsBadRequest() {
        User user = emailUser();

        assertThatThrownBy(() -> authService.deleteAccount(user, new DeleteAccountRequest("any", "delete")))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("confirmation_mismatch");
        assertThatThrownBy(() -> authService.deleteAccount(user, new DeleteAccountRequest("any", "DELETE ")))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("confirmation_mismatch");
        assertThatThrownBy(() -> authService.deleteAccount(user, new DeleteAccountRequest("any", null)))
                .isInstanceOf(BadRequestException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void deleteAccount_telegramOnlyUser_acceptsValidChallengeCode() {
        User user = telegramUser(123456789L);
        when(deleteChallengeService.consumeCode(123456789L, "123456")).thenReturn(true);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        authService.deleteAccount(user, new DeleteAccountRequest("123456", "DELETE"));

        verify(userRepository).save(user);
        assertThat(user.getDeletedAt()).isNotNull();
        assertThat(user.getTelegramId()).isNull();
    }

    @Test
    void deleteAccount_telegramOnlyUser_rejectsInvalidChallengeCode() {
        User user = telegramUser(123456789L);
        when(deleteChallengeService.consumeCode(123456789L, "999999")).thenReturn(false);

        assertThatThrownBy(() -> authService.deleteAccount(user, new DeleteAccountRequest("999999", "DELETE")))
                .isInstanceOf(InvalidCredentialsException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void issueDeleteChallenge_telegramUser_delegatesToChallengeService() {
        User user = telegramUser(987654321L);

        authService.issueDeleteChallenge(user);

        verify(deleteChallengeService).issueChallenge(987654321L);
    }

    @Test
    void issueDeleteChallenge_emailUser_throwsConflict() {
        User user = emailUser();

        assertThatThrownBy(() -> authService.issueDeleteChallenge(user))
                .isInstanceOf(ConflictException.class)
                .hasMessage("challenge_not_supported");
    }

    @Test
    void deleteAccount_nullUser_throwsInvalidCredentials() {
        assertThatThrownBy(() -> authService.deleteAccount(null, new DeleteAccountRequest("x", "DELETE")))
                .isInstanceOf(InvalidCredentialsException.class);
    }
}
