package com.reinasleo.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reinasleo.api.client.YooKassaAmount;
import com.reinasleo.api.client.YooKassaClient;
import com.reinasleo.api.client.YooKassaPaymentResponse;
import com.reinasleo.api.model.Order;
import com.reinasleo.api.model.OrderItem;
import com.reinasleo.api.model.Payment;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.OrderRepository;
import com.reinasleo.api.repository.PaymentEventRepository;
import com.reinasleo.api.repository.PaymentRepository;
import com.reinasleo.api.repository.ProductRepository;
import com.reinasleo.api.repository.UserRepository;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.io.IOException;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Заказ сайта → приём аналитики. Круг настоящий: вебхук ЮKassa «оплачено»
 * проходит через PaymentWebhookService, заказ становится paid, и после коммита
 * снимок уходит на локальный HTTP-сервер вместо приёма.
 *
 * Сторожит то, что ломается молча:
 * 1. ОПЛАЧЕННЫЙ ЗАКАЗ ДОЕЗЖАЕТ сам, без ручного прогона.
 * 2. ПОВТОР — ТОТ ЖЕ ЗАКАЗ, А НЕ КОПИЯ: order_id прежний, в конверте он один.
 *    Выборку с позициями Hibernate 6 сам сводит к одному заказу (проверено
 *    мутацией 25.09); тест стережёт это на случай смены запроса.
 * 3. ПОЛЯ — РОВНО ТЕ, ЧТО ЗНАЕТ ПРИЁМ, и никаких персональных данных.
 * 4. СУММА СХОДИТСЯ С ПОЗИЦИЯМИ: иначе в аналитике не понять, откуда разница.
 */
@SpringBootTest
@ActiveProfiles("test")
class SiteOrderPublisherTest {

    private static final String SECRET = "orders-test-secret";
    private static final String PAYMENT_ID = "yk-site-order-1";
    private static final Instant CAPTURED = Instant.parse("2026-09-25T09:15:30Z");
    // Тот же шаблон, что _IDEMPOTENCY_KEY_RE в leo_analytics routers/ingest.py.
    private static final Pattern INGEST_KEY = Pattern.compile("^[A-Za-z0-9_\\-:.]{1,255}$");
    // Контракт site_order, согласованный с аналитикой 25.09 — ни больше ни меньше.
    private static final Set<String> ORDER_FIELDS = Set.of(
            "type", "order_id", "created_at", "paid_at", "status", "payment_status",
            "items_total_kop", "delivery_kop", "refunded_kop", "updated_at", "items");
    private static final Set<String> ITEM_FIELDS = Set.of(
            "product_id", "sku", "wb_nm", "size", "quantity", "price_kop");

    private record Received(String key, String secret, Map<String, Object> body) {}

    private static final List<Received> RECEIVED = new CopyOnWriteArrayList<>();
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final HttpServer SERVER = startServer();

    private static HttpServer startServer() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/api/v1/ingest", exchange -> {
                @SuppressWarnings("unchecked")
                Map<String, Object> body = JSON.readValue(exchange.getRequestBody(), Map.class);
                RECEIVED.add(new Received(exchange.getRequestHeaders().getFirst("Idempotency-Key"),
                        exchange.getRequestHeaders().getFirst("X-Ingest-Secret"), body));
                byte[] ok = "{\"ingest_event_id\":1,\"rows_written\":1}".getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(200, ok.length);
                try (OutputStream out = exchange.getResponseBody()) {
                    out.write(ok);
                }
            });
            server.start();
            return server;
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    @DynamicPropertySource
    static void ingest(DynamicPropertyRegistry registry) {
        registry.add("app.analytics.ingest-url",
                () -> "http://127.0.0.1:" + SERVER.getAddress().getPort() + "/api/v1/ingest");
        registry.add("app.analytics.ingest-secret", () -> SECRET);
    }

    @MockBean private YooKassaClient yooKassa;
    @Autowired private PaymentWebhookService webhook;
    @Autowired private SiteOrderPublisher publisher;
    @Autowired private OrderRepository orders;
    @Autowired private PaymentRepository payments;
    @Autowired private PaymentEventRepository paymentEvents;
    @Autowired private ProductRepository products;
    @Autowired private UserRepository users;

    private User user;
    private Product coat;
    private Product scarf;

    @BeforeEach
    void setUp() {
        RECEIVED.clear();
        user = users.save(new User("site-order@test.dev", "Имя", "Фамилия", "hash",
                LocalDate.of(1990, 1, 1), false, true));
        coat = products.save(product("so-coat", 1_234_567L, "3000.50"));
        scarf = products.save(product("so-scarf", null, "999.75"));
    }

    @AfterEach
    void tearDown() {
        paymentEvents.deleteAll();
        payments.deleteAll();
        orders.deleteAll();
        products.deleteAllById(List.of("so-coat", "so-scarf"));
        users.findByEmailIgnoreCase("site-order@test.dev").ifPresent(users::delete);
    }

    private static Product product(String id, Long nm, String price) {
        Product p = new Product();
        p.setId(id);
        p.setTitle(id);
        p.setPrice(new BigDecimal(price));
        p.setImage("/images/white/products/a.jpg");
        p.setCategory("tailoring");
        p.setSizes(new String[]{"S", "M"});
        p.setNm(nm);
        p.setSku(nm == null ? null : "WB-" + nm);
        p.setImages("[]");
        return p;
    }

    // Как у CheckoutService: сумма = Σ цена × количество, доставка отдельно.
    private Order awaitingPayment(String status) {
        Order order = new Order(user, new BigDecimal("5000.00"));
        order.setStatus(status);
        order.setCustomerEmail("buyer@secret.example");
        order.setCustomerPhone("+79990000000");
        order.setCustomerName("Покупатель");
        order.setDeliveryCost(new BigDecimal("350.00"));
        order.getItems().add(new OrderItem(order, coat, "M", 1, new BigDecimal("3000.50")));
        order.getItems().add(new OrderItem(order, scarf, null, 2, new BigDecimal("999.75")));
        order = orders.save(order);
        payments.save(new Payment(order, "YOOKASSA", PAYMENT_ID, new BigDecimal("5000.00"), "pending"));
        return order;
    }

    private void payViaWebhook() {
        when(yooKassa.getPayment(PAYMENT_ID)).thenReturn(new YooKassaPaymentResponse(PAYMENT_ID, "succeeded", true,
                new YooKassaAmount("5000.00", "RUB"), null, CAPTURED.toString(), Map.of()));
        webhook.process("payment.succeeded", PAYMENT_ID);
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> events(Received r) {
        return (List<Map<String, Object>>) r.body().get("events");
    }

    private static List<Map<String, Object>> eventsFor(UUID orderId) {
        return RECEIVED.stream()
                .flatMap(r -> events(r).stream())
                .filter(e -> orderId.toString().equals(e.get("order_id")))
                .toList();
    }

    private static Map<String, Object> awaitStatus(UUID orderId, String status) throws InterruptedException {
        long deadline = System.currentTimeMillis() + 10_000;
        while (System.currentTimeMillis() < deadline) {
            List<Map<String, Object>> seen = eventsFor(orderId);
            if (!seen.isEmpty() && status.equals(seen.get(seen.size() - 1).get("status"))) {
                return seen.get(seen.size() - 1);
            }
            Thread.sleep(50);
        }
        throw new AssertionError("no '" + status + "' snapshot of " + orderId + " arrived; got " + eventsFor(orderId));
    }

    @Test
    void aPaidOrderArrivesByItselfWithItsSnapshot() throws Exception {
        Order order = awaitingPayment("awaiting_payment");

        payViaWebhook();

        Map<String, Object> event = awaitStatus(order.getId(), "paid");
        assertThat(event.keySet()).isEqualTo(ORDER_FIELDS);
        assertThat(event)
                .containsEntry("type", "site_order")
                .containsEntry("paid_at", CAPTURED.toString())
                .containsEntry("payment_status", "succeeded")
                .containsEntry("items_total_kop", 500_000)
                .containsEntry("delivery_kop", 35_000)
                .containsEntry("refunded_kop", 0);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> items = (List<Map<String, Object>>) event.get("items");
        assertThat(items).hasSize(2).allSatisfy(i -> assertThat(i.keySet()).isEqualTo(ITEM_FIELDS));
        assertThat(items).anySatisfy(i -> assertThat(i)
                .containsEntry("product_id", "so-coat").containsEntry("sku", "WB-1234567")
                .containsEntry("wb_nm", 1_234_567).containsEntry("size", "M")
                .containsEntry("quantity", 1).containsEntry("price_kop", 300_050));
        // Артикула WB нет — null, а не пропуск: аналитика покажет строку «без артикула».
        assertThat(items).anySatisfy(i -> assertThat(i)
                .containsEntry("product_id", "so-scarf").containsEntry("wb_nm", null)
                .containsEntry("quantity", 2).containsEntry("price_kop", 99_975));
        long sum = items.stream()
                .mapToLong(i -> ((Number) i.get("price_kop")).longValue() * ((Number) i.get("quantity")).longValue())
                .sum();
        assertThat(sum).isEqualTo(((Number) event.get("items_total_kop")).longValue());

        // Персональные данные не уезжают ни в каком виде.
        String raw = JSON.writeValueAsString(RECEIVED);
        assertThat(raw).doesNotContain("buyer@secret.example", "+79990000000", "Покупатель", "site-order@test.dev");
        assertThat(RECEIVED).allSatisfy(r -> {
            assertThat(r.secret()).isEqualTo(SECRET);
            assertThat(r.key()).matches(INGEST_KEY);
            assertThat(r.body()).containsEntry("source", "site");
        });
    }

    @Test
    void aRepeatSendsTheSameOrderNotACopy() throws Exception {
        Order order = awaitingPayment("awaiting_payment");
        payViaWebhook();
        awaitStatus(order.getId(), "paid");
        int before = RECEIVED.size();
        String firstKey = RECEIVED.get(before - 1).key();

        SiteOrderPublisher.Result result = publisher.publishUpdatedSince(Instant.now().minusSeconds(3600));

        assertThat(result.failed()).isZero();
        List<Received> repeat = RECEIVED.subList(before, RECEIVED.size());
        assertThat(repeat).hasSize(1);
        // Две позиции у заказа, а в конверте он ровно один раз.
        List<Map<String, Object>> sameOrder = events(repeat.get(0)).stream()
                .filter(e -> order.getId().toString().equals(e.get("order_id")))
                .toList();
        assertThat(sameOrder).hasSize(1);
        assertThat(sameOrder.get(0)).containsEntry("status", "paid");
        // Новый ключ у каждого прогона: с прежним приём ответил бы 409.
        assertThat(repeat.get(0).key()).isNotEqualTo(firstKey);
    }

    @Test
    void aDraftIsNotAnOrderYet() {
        Order draft = awaitingPayment("draft");

        publisher.publishUpdatedSince(Instant.now().minusSeconds(3600));

        assertThat(eventsFor(draft.getId())).isEmpty();
    }

    // Прежний статус из OrderService ('pending') уходит в словаре приёма.
    @Test
    void aLegacyPendingGoesOutAsAwaitingPayment() {
        Order legacy = awaitingPayment("pending");

        publisher.publishUpdatedSince(Instant.now().minusSeconds(3600));

        assertThat(eventsFor(legacy.getId())).singleElement()
                .satisfies(e -> assertThat(e).containsEntry("status", "awaiting_payment").containsEntry("paid_at", null));
    }

    @Test
    void withoutAnAddressNothingIsSentAndTheAppLives() {
        SiteOrderPublisher off = new SiteOrderPublisher(orders, payments, JSON, "", SECRET);

        assertThat(off.publishUpdatedSince(Instant.EPOCH).enabled()).isFalse();
        assertThat(RECEIVED).isEmpty();
    }

    @Test
    void kopecksAreExact() {
        assertThat(SiteOrderPublisher.kop(new BigDecimal("3000.50"))).isEqualTo(300_050L);
        assertThat(SiteOrderPublisher.kop(new BigDecimal("0.01"))).isEqualTo(1L);
        assertThat(SiteOrderPublisher.kop(new BigDecimal("12"))).isEqualTo(1_200L);
    }
}
