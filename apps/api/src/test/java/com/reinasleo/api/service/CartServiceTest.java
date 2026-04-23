package com.reinasleo.api.service;

import com.reinasleo.api.dto.CartItemRequest;
import com.reinasleo.api.dto.UpdateCartItemRequest;
import com.reinasleo.api.exception.OutOfStockException;
import com.reinasleo.api.model.Cart;
import com.reinasleo.api.model.CartItem;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.CartItemRepository;
import com.reinasleo.api.repository.CartRepository;
import com.reinasleo.api.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CartServiceTest {

    @Mock private CartRepository cartRepository;
    @Mock private CartItemRepository cartItemRepository;
    @Mock private ProductRepository productRepository;
    @Mock private AnalyticsService analyticsService;

    private CartService cartService;

    @BeforeEach
    void setUp() {
        cartService = new CartService(cartRepository, cartItemRepository, productRepository, analyticsService);
    }

    private User buildUser() {
        User user = new User("stock@example.com", "Jane", "Doe", "hashed",
                LocalDate.of(1990, 1, 1), true, true);
        setField(user, "id", UUID.randomUUID());
        return user;
    }

    private Product buildProduct(String id, int stock) {
        Product p = new Product();
        p.setId(id);
        p.setTitle("Test");
        p.setPrice(new BigDecimal("10.00"));
        p.setStockQuantity(stock);
        p.setActive(true);
        return p;
    }

    private Cart buildCart(User user) {
        Cart cart = new Cart(user);
        setField(cart, "id", UUID.randomUUID());
        return cart;
    }

    private static void setField(Object target, String name, Object value) {
        try {
            Field f = target.getClass().getDeclaredField(name);
            f.setAccessible(true);
            f.set(target, value);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void addItem_whenQuantityExceedsStock_throwsOutOfStock() {
        User user = buildUser();
        Product product = buildProduct("prod-1", 3);
        Cart cart = buildCart(user);

        when(productRepository.findById("prod-1")).thenReturn(Optional.of(product));
        when(cartRepository.findByUserId(user.getId())).thenReturn(Optional.of(cart));
        when(cartItemRepository.findByCartIdAndProductIdAndSize(cart.getId(), "prod-1", "M"))
                .thenReturn(Optional.empty());

        CartItemRequest request = new CartItemRequest("prod-1", "M", 5);

        assertThatThrownBy(() -> cartService.addItem(user, request))
                .isInstanceOf(OutOfStockException.class)
                .satisfies(ex -> {
                    OutOfStockException e = (OutOfStockException) ex;
                    assert e.getProductId().equals("prod-1");
                    assert e.getRequestedQuantity() == 5;
                    assert e.getAvailableStock() == 3;
                });
    }

    @Test
    void addItem_whenCumulativeQuantityExceedsStock_throwsOutOfStock() {
        User user = buildUser();
        Product product = buildProduct("prod-2", 5);
        Cart cart = buildCart(user);

        CartItem existing = new CartItem(cart, product, "M", 4);

        when(productRepository.findById("prod-2")).thenReturn(Optional.of(product));
        when(cartRepository.findByUserId(user.getId())).thenReturn(Optional.of(cart));
        when(cartItemRepository.findByCartIdAndProductIdAndSize(cart.getId(), "prod-2", "M"))
                .thenReturn(Optional.of(existing));

        CartItemRequest request = new CartItemRequest("prod-2", "M", 3);

        assertThatThrownBy(() -> cartService.addItem(user, request))
                .isInstanceOf(OutOfStockException.class)
                .satisfies(ex -> {
                    OutOfStockException e = (OutOfStockException) ex;
                    assert e.getRequestedQuantity() == 7;
                    assert e.getAvailableStock() == 5;
                });
    }

    @Test
    void addItem_whenWithinStock_succeeds() {
        User user = buildUser();
        Product product = buildProduct("prod-3", 10);
        Cart cart = buildCart(user);

        when(productRepository.findById("prod-3")).thenReturn(Optional.of(product));
        when(cartRepository.findByUserId(user.getId())).thenReturn(Optional.of(cart));
        when(cartItemRepository.findByCartIdAndProductIdAndSize(cart.getId(), "prod-3", "M"))
                .thenReturn(Optional.empty());
        when(cartRepository.save(any(Cart.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().doNothing().when(analyticsService).trackEvent(any(), any(), any());

        CartItemRequest request = new CartItemRequest("prod-3", "M", 2);

        cartService.addItem(user, request);
    }

    @Test
    void updateItem_whenQuantityExceedsStock_throwsOutOfStock() {
        User user = buildUser();
        Product product = buildProduct("prod-4", 2);
        Cart cart = buildCart(user);
        CartItem item = new CartItem(cart, product, "M", 1);
        setField(item, "id", UUID.randomUUID());
        cart.getItems().add(item);

        when(cartRepository.findByUserId(user.getId())).thenReturn(Optional.of(cart));

        UpdateCartItemRequest request = new UpdateCartItemRequest(10);

        assertThatThrownBy(() -> cartService.updateItem(user, item.getId(), request))
                .isInstanceOf(OutOfStockException.class);
    }
}
