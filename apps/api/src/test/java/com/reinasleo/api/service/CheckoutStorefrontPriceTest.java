package com.reinasleo.api.service;

import com.reinasleo.api.client.CreatePaymentRequest;
import com.reinasleo.api.client.YooKassaAmount;
import com.reinasleo.api.client.YooKassaClient;
import com.reinasleo.api.client.YooKassaConfirmationResponse;
import com.reinasleo.api.client.YooKassaPaymentResponse;
import com.reinasleo.api.dto.CheckoutAddressRequest;
import com.reinasleo.api.dto.CheckoutItemRequest;
import com.reinasleo.api.dto.CheckoutRequest;
import com.reinasleo.api.dto.CheckoutResponse;
import com.reinasleo.api.dto.storefront.StorefrontColour;
import com.reinasleo.api.model.MarketplacePrice;
import com.reinasleo.api.model.Order;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.ProductModel;
import com.reinasleo.api.repository.MarketplacePriceRepository;
import com.reinasleo.api.repository.OrderRepository;
import com.reinasleo.api.repository.ProductModelRepository;
import com.reinasleo.api.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.cache.CacheManager;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Круг цены (lw-95wh): ЦЕНА НА ВИТРИНЕ == ЦЕНА ПОЗИЦИИ В ЗАКАЗЕ == СУММА
 * ПЛАТЕЖА И СТРОКА ЧЕКА В ЮKASSA. До 25.09 касса брала сырое products.price,
 * а витрина — VariantPriceCalculator; покупатель увидел бы одну сумму, а
 * заплатил другую.
 *
 * Витрина здесь настоящая (StorefrontService.getStorefront — то, что отдаёт
 * /api/storefront), касса настоящая (CheckoutService), подделан только сетевой
 * клиент ЮKassa: он ловит запрос на создание платежа. По одному случаю на
 * каждую ветку калькулятора, и у каждого сырое products.price НАРОЧНО другое —
 * иначе прежняя касса совпала бы с витриной случайно.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
@TestPropertySource(properties = {
        "yookassa.enabled=true",
        "yookassa.shop-id=test-shop",
        "yookassa.secret-key=test-secret",
})
class CheckoutStorefrontPriceTest {

    private static final int QTY = 2;

    @MockBean private YooKassaClient yooKassa;
    @Autowired private StorefrontService storefront;
    @Autowired private CheckoutService checkout;
    @Autowired private CacheManager caches;
    @Autowired private ProductModelRepository models;
    @Autowired private ProductRepository products;
    @Autowired private MarketplacePriceRepository marketplacePrices;
    @Autowired private OrderRepository orders;

    private UUID modelId;

    @BeforeEach
    void setUp() {
        ProductModel m = new ProductModel();
        m.setModelKey(987_654);
        m.setSlug("price-circle-coat");
        m.setNameRu("Пальто для круга цены");
        m.setNameEn("Price circle coat");
        m.setCategory("tailoring");
        m.setDescRu("к");
        m.setDescEn("d");
        m.setCompositionRu("шерсть");
        m.setCompositionEn("wool");
        m.setCareRu("чистка");
        m.setCareEn("dry clean");
        m.setSizes(new String[]{"S", "M"});
        m.setImage("/images/white/products/a.jpg");
        m.setActive(true);
        modelId = models.save(m).getId();

        when(yooKassa.createPayment(any(CreatePaymentRequest.class), any(UUID.class)))
                .thenReturn(new YooKassaPaymentResponse("yk-price-circle", "pending", false,
                        new YooKassaAmount("0.00", "RUB"),
                        new YooKassaConfirmationResponse("redirect", "https://yookassa.ru/confirm/x"),
                        null, Map.of()));
    }

    private Product variant(String id, String rawPrice, String source, int discountPct, int order) {
        Product p = new Product();
        p.setId(id);
        p.setTitle("Пальто — " + id);
        p.setPrice(new BigDecimal(rawPrice));
        p.setPriceSource(source);
        p.setDiscountPct(discountPct);
        p.setImage("/images/white/products/a.jpg");
        p.setCategory("tailoring");
        p.setSizes(new String[]{"S", "M"});
        p.setModelId(modelId);
        p.setColorKey(id);
        p.setColorHex("#ece6da");
        p.setColorNameRu(id);
        p.setColorNameEn(id);
        p.setColor(id);
        p.setSortOrder(order);
        p.setImages("[]");
        p.setStockQuantity(10);
        p.setActive(true);
        return products.save(p);
    }

    private void marketplaceRow(String productId, String source, Long buyerKop, Long costKop) {
        MarketplacePrice row = new MarketplacePrice();
        row.setProductId(productId);
        row.setSource(source);
        row.setBuyerPriceKop(buyerKop);
        row.setCostPriceKop(costKop);
        row.setReceivedAt(Instant.now());
        marketplacePrices.save(row);
    }

    /** Что витрина показывает покупателю за этот цвет: sale, если есть, иначе price. */
    private BigDecimal shownOnStorefront(String variantId) {
        caches.getCache("storefront").clear();
        StorefrontColour colour = storefront.getStorefront().products().stream()
                .flatMap(p -> p.colors().stream())
                .filter(c -> variantId.equals(c.id()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("variant " + variantId + " is not on the storefront"));
        return colour.sale() != null ? colour.sale() : colour.price();
    }

    private void assertTheCircle(String variantId, String expectedUnit) {
        BigDecimal shown = shownOnStorefront(variantId);
        assertThat(shown).as("витрина").isEqualByComparingTo(expectedUnit);

        reset(yooKassa);
        when(yooKassa.createPayment(any(CreatePaymentRequest.class), any(UUID.class)))
                .thenReturn(new YooKassaPaymentResponse("yk-" + variantId, "pending", false,
                        new YooKassaAmount("0.00", "RUB"),
                        new YooKassaConfirmationResponse("redirect", "https://yookassa.ru/confirm/x"),
                        null, Map.of()));
        CheckoutResponse response = checkout.createOrder(new CheckoutRequest(
                List.of(new CheckoutItemRequest(variantId, "M", QTY)),
                "circle@test.dev", "+79990000000", "Покупатель",
                new CheckoutAddressRequest("Москва", "Тверская", "1", null, null)), null);

        Order order = orders.findById(response.orderId()).orElseThrow();
        BigDecimal total = shown.multiply(BigDecimal.valueOf(QTY));
        assertThat(order.getItems()).singleElement()
                .satisfies(i -> assertThat(i.getPrice()).as("позиция заказа").isEqualByComparingTo(shown));
        assertThat(order.getTotal()).as("сумма заказа").isEqualByComparingTo(total);

        ArgumentCaptor<CreatePaymentRequest> sent = ArgumentCaptor.forClass(CreatePaymentRequest.class);
        verify(yooKassa).createPayment(sent.capture(), any(UUID.class));
        assertThat(sent.getValue().amount()).as("платёж ЮKassa").isEqualTo(YooKassaAmount.rub(total));
        assertThat(sent.getValue().receipt().items()).singleElement()
                .satisfies(i -> assertThat(i.amount()).as("строка чека").isEqualTo(YooKassaAmount.rub(shown)));
    }

    @Test
    void noDiscountTheRawPriceIsTheShownPrice() {
        variant("pc-manual", "5000.00", "manual", 0, 1);
        assertTheCircle("pc-manual", "5000.00");
    }

    // Скидка 20% от 4999.99 = 3999.992 → вниз до копейки: 3999.99.
    @Test
    void discountPctIsWhatTheBuyerPays() {
        variant("pc-discount", "4999.99", "manual", 20, 1);
        assertTheCircle("pc-discount", "3999.99");
    }

    // Переключатель на площадку: основа — её цена покупателя, а не устаревшая ручная.
    @Test
    void marketplaceSourcedPriceIsWhatTheBuyerPays() {
        variant("pc-market", "5000.00", "wildberries", 0, 1);
        marketplaceRow("pc-market", "wildberries", 4_100_00L, null);
        assertTheCircle("pc-market", "4100.00");
    }

    // Скидка 50% дала бы 2500, но себестоимость 3000 — порог поднимает цену до неё.
    @Test
    void costThresholdIsWhatTheBuyerPays() {
        variant("pc-threshold", "5000.00", "manual", 50, 1);
        marketplaceRow("pc-threshold", null, null, 3_000_00L);
        assertTheCircle("pc-threshold", "3000.00");
    }
}
