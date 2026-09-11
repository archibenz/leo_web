package com.reinasleo.api.service;

import com.reinasleo.api.dto.AdminProductRequest;
import com.reinasleo.api.dto.AdminProductResponse;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.repository.BotVisitRepository;
import com.reinasleo.api.repository.CollectionRepository;
import com.reinasleo.api.repository.OrderRepository;
import com.reinasleo.api.repository.ProductInterestEventRepository;
import com.reinasleo.api.repository.ProductRepository;
import com.reinasleo.api.repository.StockAlertRepository;
import com.reinasleo.api.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminProductServiceTest {

    @Mock private ProductRepository productRepository;
    @Mock private CollectionRepository collectionRepository;
    @Mock private StockAlertRepository stockAlertRepository;
    @Mock private UserRepository userRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private BotVisitRepository botVisitRepository;
    @Mock private ProductInterestEventRepository productInterestEventRepository;
    @Mock private ApplicationEventPublisher events;

    private AdminProductService service;

    @BeforeEach
    void setUp() {
        service = new AdminProductService(productRepository, collectionRepository, stockAlertRepository,
                userRepository, orderRepository, botVisitRepository, productInterestEventRepository, events);
        lenient().when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private static AdminProductRequest request(BigDecimal price) {
        return new AdminProductRequest(
                "wb-1287075011", "Спортивный костюм с кантом", "описание", price,
                "knitwear", new String[]{"S", "M"}, null, 0, 5,
                null, null, null, null, null, null, true, null);
    }

    @Test
    void update_withoutPrice_persistsNullInsteadOfKeepingTheOldNumber() {
        // Редактирование предзаказной строки: цены нет и быть не должно —
        // владелец правит описание, а не открывает продажу.
        Product existing = new Product();
        existing.setId("wb-1287075011");
        existing.setTitle("старое имя");
        existing.setPrice(new BigDecimal("5000"));
        existing.setStockQuantity(0);
        when(productRepository.findById("wb-1287075011")).thenReturn(Optional.of(existing));

        AdminProductResponse response = service.update("wb-1287075011", request(null));

        assertThat(existing.getPrice()).isNull();
        assertThat(response.price()).isNull();
        assertThat(response.title()).isEqualTo("Спортивный костюм с кантом");
    }

    @Test
    void update_withPrice_keepsIt() {
        Product existing = new Product();
        existing.setId("wb-1287075011");
        existing.setPrice(null);
        existing.setStockQuantity(0);
        when(productRepository.findById("wb-1287075011")).thenReturn(Optional.of(existing));

        AdminProductResponse response = service.update("wb-1287075011", request(new BigDecimal("5000")));

        assertThat(response.price()).isEqualByComparingTo("5000");
    }
}
