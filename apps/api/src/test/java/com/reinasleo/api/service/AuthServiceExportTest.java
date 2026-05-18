package com.reinasleo.api.service;

import com.reinasleo.api.dto.AccountExportResponse;
import com.reinasleo.api.exception.InvalidCredentialsException;
import com.reinasleo.api.model.Cart;
import com.reinasleo.api.model.CartItem;
import com.reinasleo.api.model.Favorite;
import com.reinasleo.api.model.Order;
import com.reinasleo.api.model.OrderItem;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.CartItemRepository;
import com.reinasleo.api.repository.CartRepository;
import com.reinasleo.api.repository.FavoriteRepository;
import com.reinasleo.api.repository.OrderRepository;
import com.reinasleo.api.repository.UserRepository;
import com.reinasleo.api.repository.VerificationCodeRepository;
import com.reinasleo.api.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceExportTest {

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

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, jwtService,
                verificationService, deleteChallengeService,
                cartItemRepository, cartRepository, favoriteRepository,
                orderRepository, verificationCodeRepository);
    }

    private static User emailUser() {
        User user = new User("alice@example.com", "Alice", "Smith",
                "hashed-pw", LocalDate.of(1990, 1, 1), true, true);
        setField(user, "id", UUID.randomUUID());
        return user;
    }

    private static Product product(String id, String title, BigDecimal price) {
        Product p = new Product();
        p.setId(id);
        p.setTitle(title);
        p.setPrice(price);
        return p;
    }

    private static void setField(Object target, String name, Object value) {
        try {
            Field f = target.getClass().getDeclaredField(name);
            f.setAccessible(true);
            f.set(target, value);
        } catch (Exception ignored) {}
    }

    @Test
    void exportAccountData_emptyAccount_returnsUserOnly() {
        User user = emailUser();
        when(orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId())).thenReturn(List.of());
        when(cartRepository.findByUserId(user.getId())).thenReturn(Optional.empty());
        when(favoriteRepository.findByUserId(user.getId())).thenReturn(List.of());
        when(verificationCodeRepository.countByEmail("alice@example.com")).thenReturn(0L);

        AccountExportResponse response = authService.exportAccountData(user);

        assertThat(response.user()).isNotNull();
        assertThat(response.user().email()).isEqualTo("alice@example.com");
        assertThat(response.user().name()).isEqualTo("Alice");
        assertThat(response.user().surname()).isEqualTo("Smith");
        assertThat(response.user().hasPassword()).isTrue();
        assertThat(response.user().hasTelegram()).isFalse();
        assertThat(response.orders()).isEmpty();
        assertThat(response.cart().items()).isEmpty();
        assertThat(response.favorites()).isEmpty();
        assertThat(response.verificationCodesIssued()).isZero();
        assertThat(response.exportedAt()).isNotNull();
    }

    @Test
    void exportAccountData_withOrders_aggregatesOrdersAndItems() {
        User user = emailUser();
        Product dress = product("p-dress", "Платье X", new BigDecimal("12500.00"));

        Order order = new Order(user, new BigDecimal("12500.00"));
        setField(order, "id", UUID.randomUUID());
        OrderItem orderItem = new OrderItem(order, dress, "M", 1, new BigDecimal("12500.00"));
        order.getItems().add(orderItem);

        when(orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId())).thenReturn(List.of(order));
        when(cartRepository.findByUserId(user.getId())).thenReturn(Optional.empty());
        when(favoriteRepository.findByUserId(user.getId())).thenReturn(List.of());
        when(verificationCodeRepository.countByEmail("alice@example.com")).thenReturn(3L);

        AccountExportResponse response = authService.exportAccountData(user);

        assertThat(response.orders()).hasSize(1);
        assertThat(response.orders().get(0).items()).hasSize(1);
        assertThat(response.orders().get(0).items().get(0).productId()).isEqualTo("p-dress");
        assertThat(response.orders().get(0).items().get(0).productTitle()).isEqualTo("Платье X");
        assertThat(response.orders().get(0).items().get(0).size()).isEqualTo("M");
        assertThat(response.orders().get(0).items().get(0).quantity()).isEqualTo(1);
        assertThat(response.orders().get(0).total()).isEqualByComparingTo("12500.00");
        assertThat(response.verificationCodesIssued()).isEqualTo(3L);
    }

    @Test
    void exportAccountData_withCart_aggregatesCartItems() {
        User user = emailUser();
        Product hat = product("p-hat", "Hat", new BigDecimal("3500.00"));

        Cart cart = new Cart(user);
        setField(cart, "id", UUID.randomUUID());
        CartItem item = new CartItem(cart, hat, "L", 2);
        cart.getItems().add(item);

        when(orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId())).thenReturn(List.of());
        when(cartRepository.findByUserId(user.getId())).thenReturn(Optional.of(cart));
        when(favoriteRepository.findByUserId(user.getId())).thenReturn(List.of());
        when(verificationCodeRepository.countByEmail("alice@example.com")).thenReturn(0L);

        AccountExportResponse response = authService.exportAccountData(user);

        assertThat(response.cart().items()).hasSize(1);
        assertThat(response.cart().items().get(0).productId()).isEqualTo("p-hat");
        assertThat(response.cart().items().get(0).size()).isEqualTo("L");
        assertThat(response.cart().items().get(0).quantity()).isEqualTo(2);
    }

    @Test
    void exportAccountData_withFavorites_aggregatesFavorites() {
        User user = emailUser();
        Product fav1 = product("p-fav-1", "Fav One", new BigDecimal("5500.00"));

        Favorite fav = new Favorite(user, fav1);

        when(orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId())).thenReturn(List.of());
        when(cartRepository.findByUserId(user.getId())).thenReturn(Optional.empty());
        when(favoriteRepository.findByUserId(user.getId())).thenReturn(List.of(fav));
        when(verificationCodeRepository.countByEmail("alice@example.com")).thenReturn(0L);

        AccountExportResponse response = authService.exportAccountData(user);

        assertThat(response.favorites()).hasSize(1);
        assertThat(response.favorites().get(0).productId()).isEqualTo("p-fav-1");
        assertThat(response.favorites().get(0).productTitle()).isEqualTo("Fav One");
    }

    @Test
    void exportAccountData_nullUser_throwsInvalidCredentials() {
        assertThatThrownBy(() -> authService.exportAccountData(null))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void exportAccountData_doesNotIncludePasswordHash() {
        User user = emailUser();
        when(orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId())).thenReturn(List.of());
        when(cartRepository.findByUserId(user.getId())).thenReturn(Optional.empty());
        when(favoriteRepository.findByUserId(user.getId())).thenReturn(List.of());
        when(verificationCodeRepository.countByEmail("alice@example.com")).thenReturn(0L);

        AccountExportResponse response = authService.exportAccountData(user);

        // UserExportDto has no passwordHash / passwordHash() accessor — boolean hasPassword only.
        assertThat(response.user().hasPassword()).isTrue();
    }
}
