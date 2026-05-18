package com.reinasleo.api.service;

import com.reinasleo.api.model.Cart;
import com.reinasleo.api.model.CartItem;
import com.reinasleo.api.model.Order;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.CartRepository;
import com.reinasleo.api.repository.OrderRepository;
import com.reinasleo.api.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock private OrderRepository orderRepository;
    @Mock private CartRepository cartRepository;
    @Mock private ProductRepository productRepository;
    @Mock private AnalyticsService analyticsService;

    private OrderService orderService;

    @BeforeEach
    void setUp() {
        orderService = new OrderService(orderRepository, cartRepository, productRepository, analyticsService);
    }

    private User buildUser() {
        User user = new User("checkout@example.com", "Jane", "Doe", "hashed",
                LocalDate.of(1990, 1, 1), true, true);
        setField(user, "id", UUID.randomUUID());
        return user;
    }

    private Product buildProduct(String id, int stock) {
        Product p = new Product();
        p.setId(id);
        p.setTitle("Test " + id);
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
    void checkout_acquiresProductLocksInAscendingProductIdOrder() {
        User user = buildUser();
        // Insertion order intentionally non-sorted to prove the service sorts before locking.
        Product pZ = buildProduct("z-prod", 5);
        Product pA = buildProduct("a-prod", 5);
        Product pM = buildProduct("m-prod", 5);

        Cart cart = buildCart(user);
        cart.getItems().add(new CartItem(cart, pZ, "M", 1));
        cart.getItems().add(new CartItem(cart, pA, "M", 1));
        cart.getItems().add(new CartItem(cart, pM, "M", 1));

        when(cartRepository.findByUserId(user.getId())).thenReturn(Optional.of(cart));
        when(productRepository.findByIdForUpdate("a-prod")).thenReturn(Optional.of(pA));
        when(productRepository.findByIdForUpdate("m-prod")).thenReturn(Optional.of(pM));
        when(productRepository.findByIdForUpdate("z-prod")).thenReturn(Optional.of(pZ));
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(cartRepository.save(any(Cart.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().doNothing().when(analyticsService).trackEvent(any(), any(), any());

        orderService.checkout(user);

        ArgumentCaptor<String> idCaptor = ArgumentCaptor.forClass(String.class);
        verify(productRepository, times(3)).findByIdForUpdate(idCaptor.capture());

        List<String> locked = idCaptor.getAllValues();
        assertThat(locked).containsExactly("a-prod", "m-prod", "z-prod");
        assertThat(locked).isSorted();
    }
}
