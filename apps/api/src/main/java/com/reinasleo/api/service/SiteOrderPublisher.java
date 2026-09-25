package com.reinasleo.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reinasleo.api.event.OrderStateTransitionEvent;
import com.reinasleo.api.model.Order;
import com.reinasleo.api.model.OrderItem;
import com.reinasleo.api.model.OrderState;
import com.reinasleo.api.model.Payment;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.repository.OrderRepository;
import com.reinasleo.api.repository.PaymentRepository;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

/**
 * Заказы сайта — в приём аналитики (leo_analytics, тип site_order): там сайт
 * складывается с WB и Ozon в одну сумму с разбивкой по площадкам.
 *
 * ОДНО СОБЫТИЕ = ПОЛНЫЙ СНИМОК ЗАКАЗА. Приём делает upsert по order_id и
 * заменяет позиции целиком, поэтому повтор не задваивает: сколько раз заказ ни
 * пришёл, строка одна, статус и суммы — последние.
 *
 * КОГДА ШЛЁМ. Сразу после смены статуса (после коммита, в своём потоке — ответ
 * вебхуку ЮKassa не ждёт сети до аналитики) и каждый час — все заказы,
 * изменённые за 14 суток. Второе — страховка от простоя приёма и от падения
 * первого, как у SiteDailyPublisher.
 *
 * ЧЕГО НЕ ШЛЁМ. Черновики (draft): это ещё не заказ. Почту, телефон, имя,
 * адрес и user_id: для сумм по площадкам они не нужны, а приём с
 * extra="forbid" отбил бы конверт с ними.
 *
 * Возврата и отмены на сайте пока нет (вебхук refund.* не разбирает,
 * CANCELLED/REFUNDED/RETURNED никто не ставит). Поля status и refunded_kop под
 * них готовы и наполнятся сами, когда появится поток.
 */
@Service
public class SiteOrderPublisher {

    private static final Logger log = LoggerFactory.getLogger(SiteOrderPublisher.class);

    static final Duration ROLLING = Duration.ofDays(14);
    static final int ORDERS_PER_CHUNK = 200;
    private static final String SOURCE = "site";

    private final OrderRepository orders;
    private final PaymentRepository payments;
    private final AnalyticsIngestClient ingest;
    // Один поток: снимки одного заказа не обгоняют друг друга, а всплеск
    // вебхуков встаёт в очередь, а не открывает сотню соединений.
    private final ExecutorService worker = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "site-order-publisher");
        t.setDaemon(true);
        return t;
    });

    public SiteOrderPublisher(OrderRepository orders,
                              PaymentRepository payments,
                              ObjectMapper json,
                              @Value("${app.analytics.ingest-url}") String url,
                              @Value("${app.analytics.ingest-secret}") String secret) {
        this.orders = orders;
        this.payments = payments;
        this.ingest = new AnalyticsIngestClient(json, url, secret);
    }

    public record Envelope(String key, Map<String, Object> body) {}

    public record Result(boolean enabled, int orders, int sent, int failed, List<String> failures) {}

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onTransition(OrderStateTransitionEvent event) {
        if (!ingest.enabled()) return;
        UUID id = event.orderId();
        worker.execute(() -> {
            try {
                publish(List.of(id));
            } catch (RuntimeException e) {
                log.error("Site order {} → analytics failed; the hourly run will resend it", id, e);
            }
        });
    }

    @Scheduled(cron = "0 17 * * * *", zone = "Europe/Moscow")
    public void publishRecent() {
        publishUpdatedSince(Instant.now().minus(ROLLING));
    }

    public Result publish(Collection<UUID> ids) {
        if (!ingest.enabled()) return disabled();
        return send(orders.findByIdIn(ids));
    }

    public Result publishUpdatedSince(Instant since) {
        if (!ingest.enabled()) return disabled();
        return send(orders.findByUpdatedAtGreaterThanEqual(since));
    }

    @PreDestroy
    void stop() {
        worker.shutdown();
    }

    private Result disabled() {
        log.warn("ANALYTICS_INGEST_URL/ANALYTICS_INGEST_SECRET are not set: site orders are not sent to analytics");
        return new Result(false, 0, 0, 0, List.of());
    }

    private Result send(List<Order> found) {
        List<UUID> ids = found.stream().map(Order::getId).toList();
        Map<UUID, List<Payment>> byOrder = ids.isEmpty() ? Map.of()
                : payments.findByOrderIdIn(ids).stream()
                        .collect(Collectors.groupingBy(p -> p.getOrder().getId()));

        List<Map<String, Object>> events = found.stream()
                .map(o -> event(o, byOrder.getOrDefault(o.getId(), List.of())))
                .filter(Objects::nonNull)
                .toList();
        List<Envelope> envelopes = envelopes(events, Instant.now());

        int sent = 0;
        List<String> failures = new ArrayList<>();
        for (Envelope envelope : envelopes) {
            String failure = ingest.send(envelope.key(), envelope.body());
            if (failure == null) sent++;
            else failures.add(envelope.key() + ": " + failure);
        }
        if (!failures.isEmpty()) {
            log.error("Site orders → analytics: {} of {} envelopes failed: {}",
                    failures.size(), envelopes.size(), failures);
        }
        return new Result(true, events.size(), sent, failures.size(), failures);
    }

    static List<Envelope> envelopes(List<Map<String, Object>> events, Instant stamp) {
        String capturedAt = stamp.toString();
        long run = stamp.toEpochMilli();
        List<Envelope> out = new ArrayList<>();
        for (int i = 0, chunk = 1; i < events.size(); i += ORDERS_PER_CHUNK, chunk++) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("source", SOURCE);
            body.put("captured_at", capturedAt);
            body.put("events", events.subList(i, Math.min(i + ORDERS_PER_CHUNK, events.size())));
            out.add(new Envelope("site_orders:" + run + ":" + chunk, body));
        }
        return out;
    }

    /** Снимок заказа; null — заказ в аналитику не идёт (черновик или непонятный статус). */
    static Map<String, Object> event(Order order, List<Payment> orderPayments) {
        OrderState state;
        try {
            state = OrderState.fromDbValue(order.getStatus());
        } catch (IllegalArgumentException e) {
            log.warn("Site order {} has unknown status '{}'; not sent to analytics", order.getId(), order.getStatus());
            return null;
        }
        if (state == null || state == OrderState.DRAFT) return null;

        Instant paidAt = orderPayments.stream()
                .map(Payment::getCapturedAt)
                .filter(Objects::nonNull)
                .min(Comparator.naturalOrder())
                .orElse(null);
        long refunded = orderPayments.stream()
                .map(Payment::getRefundedAmount)
                .filter(Objects::nonNull)
                .mapToLong(SiteOrderPublisher::kop)
                .sum();

        Map<String, Object> event = new LinkedHashMap<>();
        event.put("type", "site_order");
        event.put("order_id", order.getId().toString());
        event.put("created_at", order.getCreatedAt().toString());
        event.put("paid_at", paidAt == null ? null : paidAt.toString());
        event.put("status", state.toDbValue());
        event.put("payment_status", order.getPaymentStatus());
        event.put("items_total_kop", kop(order.getTotal()));
        event.put("delivery_kop", order.getDeliveryCost() == null ? null : kop(order.getDeliveryCost()));
        event.put("refunded_kop", refunded);
        event.put("updated_at", order.getUpdatedAt().toString());
        event.put("items", order.getItems().stream().map(SiteOrderPublisher::item).toList());
        return event;
    }

    private static Map<String, Object> item(OrderItem it) {
        Product p = it.getProduct();
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("product_id", p.getId());
        row.put("sku", p.getSku());
        row.put("wb_nm", p.getNm());
        row.put("size", it.getSize());
        row.put("quantity", it.getQuantity());
        row.put("price_kop", kop(it.getPrice()));
        return row;
    }

    static long kop(BigDecimal rub) {
        return rub.movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();
    }
}
