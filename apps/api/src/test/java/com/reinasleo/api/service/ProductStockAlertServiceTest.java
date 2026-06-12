package com.reinasleo.api.service;

import com.reinasleo.api.event.BackInStockEvent;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.ProductStockAlert;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.ProductRepository;
import com.reinasleo.api.repository.ProductStockAlertRepository;
import com.reinasleo.api.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductStockAlertServiceTest {

    @Mock private ProductStockAlertRepository alertRepository;
    @Mock private ProductRepository productRepository;
    @Mock private UserRepository userRepository;
    @Mock private TelegramNotifier telegramNotifier;

    private ProductStockAlertService service;

    @BeforeEach
    void setUp() throws Exception {
        service = new ProductStockAlertService(
                alertRepository, productRepository, userRepository, telegramNotifier);
        Field f = ProductStockAlertService.class.getDeclaredField("publicBaseUrl");
        f.setAccessible(true);
        f.set(service, "https://reinasleo.com");
    }

    private Product activeProduct(String id) {
        Product p = new Product();
        p.setId(id);
        p.setActive(true);
        return p;
    }

    private User userWithTelegram(Long telegramId) {
        User user = new User("test@example.com", "Test", "User", "hash", null, false, true);
        user.setTelegramId(telegramId);
        return user;
    }

    // ----- subscribe -----

    @Test
    void subscribe_newAlert_savesAndReportsTelegramLinked() {
        when(productRepository.findById("p1")).thenReturn(Optional.of(activeProduct("p1")));
        when(alertRepository.existsByUserIdAndProductId(any(), eq("p1"))).thenReturn(false);

        var response = service.subscribe(userWithTelegram(111L), "p1");

        verify(alertRepository).save(any(ProductStockAlert.class));
        assertThat(response.productId()).isEqualTo("p1");
        assertThat(response.subscribed()).isTrue();
        assertThat(response.telegramLinked()).isTrue();
    }

    @Test
    void subscribe_secondCall_isIdempotent() {
        when(productRepository.findById("p1")).thenReturn(Optional.of(activeProduct("p1")));
        when(alertRepository.existsByUserIdAndProductId(any(), eq("p1")))
                .thenReturn(false)
                .thenReturn(true);

        User user = userWithTelegram(null);
        service.subscribe(user, "p1");
        var response = service.subscribe(user, "p1");

        verify(alertRepository, times(1)).save(any(ProductStockAlert.class));
        assertThat(response.subscribed()).isTrue();
        assertThat(response.telegramLinked()).isFalse();
    }

    @Test
    void subscribe_unknownProduct_throws404() {
        when(productRepository.findById("ghost")).thenReturn(Optional.empty());

        ResponseStatusException ex = catchThrowableOfType(
                () -> service.subscribe(userWithTelegram(111L), "ghost"),
                ResponseStatusException.class);

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        verify(alertRepository, never()).save(any());
    }

    @Test
    void subscribe_inactiveProduct_throws404() {
        Product inactive = activeProduct("p1");
        inactive.setActive(false);
        when(productRepository.findById("p1")).thenReturn(Optional.of(inactive));

        ResponseStatusException ex = catchThrowableOfType(
                () -> service.subscribe(userWithTelegram(111L), "p1"),
                ResponseStatusException.class);

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        verify(alertRepository, never()).save(any());
    }

    // ----- onBackInStock -----

    @Test
    void onBackInStock_notifiesLinkedUsersSkipsUnlinkedAndDeletesAlerts() {
        UUID linkedId = UUID.randomUUID();
        UUID unlinkedId = UUID.randomUUID();
        when(alertRepository.findByProductId("p1")).thenReturn(List.of(
                new ProductStockAlert(linkedId, "p1"),
                new ProductStockAlert(unlinkedId, "p1")));
        when(userRepository.findActiveById(linkedId))
                .thenReturn(Optional.of(userWithTelegram(111L)));
        when(userRepository.findActiveById(unlinkedId))
                .thenReturn(Optional.of(userWithTelegram(null)));

        service.onBackInStock(new BackInStockEvent("p1", "Silk Dress"));

        verify(telegramNotifier).sendBackInStock(
                111L, "Silk Dress", "https://reinasleo.com/ru/product/p1");
        verify(telegramNotifier, times(1)).sendBackInStock(any(), any(), any());
        verify(alertRepository).deleteByProductId("p1");
    }

    @Test
    void onBackInStock_noAlerts_doesNothing() {
        when(alertRepository.findByProductId("p1")).thenReturn(List.of());

        service.onBackInStock(new BackInStockEvent("p1", "Silk Dress"));

        verify(telegramNotifier, never()).sendBackInStock(any(), any(), any());
        verify(alertRepository, never()).deleteByProductId(any());
    }
}
