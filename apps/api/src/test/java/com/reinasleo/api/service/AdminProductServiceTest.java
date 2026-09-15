package com.reinasleo.api.service;

import com.reinasleo.api.dto.AdminProductRequest;
import com.reinasleo.api.dto.AdminProductResponse;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.repository.BotVisitRepository;
import com.reinasleo.api.repository.CollectionRepository;
import com.reinasleo.api.repository.OrderRepository;
import com.reinasleo.api.repository.ProductInterestEventRepository;
import com.reinasleo.api.exception.BelowCostException;
import com.reinasleo.api.model.MarketplacePrice;
import com.reinasleo.api.repository.MarketplacePriceRepository;
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
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
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
    @Mock private MarketplacePriceRepository marketplacePrices;

    private AdminProductService service;

    @BeforeEach
    void setUp() {
        // Запрет продавать ниже себестоимости (BelowCostGuard) собирается на
        // настоящем классе, а не подменяется: подмена скрыла бы, что он вообще
        // зовётся. Таблица цен при этом пуста, значит себестоимость неизвестна
        // и запрет не срабатывает — существующие кейсы этого файла про цену
        // ничего не утверждают и должны остаться зелёными как были.
        lenient().when(marketplacePrices.findByProductIdIn(any())).thenReturn(List.of());
        service = new AdminProductService(productRepository, collectionRepository, stockAlertRepository,
                userRepository, orderRepository, botVisitRepository, productInterestEventRepository, events,
                new BelowCostGuard(marketplacePrices));
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

    // ─── Запрет продавать ниже себестоимости, ручной путь через админскую форму ───
    //
    // Эти кейсы проверяют НЕ логику запрета (она у BelowCostGuardTest), а то,
    // что он вообще ЗОВЁТСЯ отсюда. Сторож, стоящий не на посту, тестами своей
    // логики выглядит исправным.

    private void себестоимость(String productId, long costKop) {
        MarketplacePrice row = new MarketplacePrice();
        row.setProductId(productId);
        row.setSource(null);
        row.setCostPriceKop(costKop);
        // lenient: иначе при снятом запрете Mockito ругается на неиспользованную
        // подстановку, и мутация красит ЛИШНИЙ кейс. Проверка должна краснеть
        // ровно там, где утверждает сломанное свойство.
        lenient().when(marketplacePrices.findByProductIdIn(any())).thenReturn(List.of(row));
    }

    @Test
    void update_ценаНижеСебестоимости_отказ_иСтрокаНеТронута() {
        Product existing = new Product();
        existing.setId("wb-1287075011");
        existing.setPrice(new BigDecimal("5000"));
        when(productRepository.findById("wb-1287075011")).thenReturn(Optional.of(existing));
        себестоимость("wb-1287075011", 250000L); // 2500.00

        assertThatThrownBy(() -> service.update("wb-1287075011", request(new BigDecimal("2000.00"))))
                .isInstanceOf(BelowCostException.class);

        // Отказ обязан прийти ДО записи: иначе владелец увидел бы ошибку при
        // уже изменённой цене и не знал бы, сохранилось или нет.
        assertThat(existing.getPrice()).isEqualByComparingTo("5000");
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    void update_ценаВышеСебестоимости_проходит() {
        Product existing = new Product();
        existing.setId("wb-1287075011");
        existing.setPrice(new BigDecimal("5000"));
        when(productRepository.findById("wb-1287075011")).thenReturn(Optional.of(existing));
        себестоимость("wb-1287075011", 250000L);

        service.update("wb-1287075011", request(new BigDecimal("7500.00")));

        assertThat(existing.getPrice()).isEqualByComparingTo("7500.00");
    }
}
