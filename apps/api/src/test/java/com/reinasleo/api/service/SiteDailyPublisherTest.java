package com.reinasleo.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reinasleo.api.dto.SiteDayPoint;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Отправитель дневных чисел в приём аналитики. Сторожит три вещи, каждая из
 * которых ломается молча:
 *
 * 1. КЛЮЧ НЕСЁТ ШТАМП ПРОГОНА. С ключом по одной дате второй прогон за те же
 *    сутки получил бы 409, и день замёрз бы на утренних числах.
 * 2. 409 — ПРОВАЛ, а не «уже принято».
 * 3. ПОЛЯ — РОВНО ТЕ, ЧТО ЗНАЕТ ПРИЁМ: там extra="forbid", лишнее поле
 *    отбивает весь конверт.
 */
class SiteDailyPublisherTest {

    private static final LocalDate DAY = LocalDate.parse("2026-09-23");
    // Тот же шаблон, что _IDEMPOTENCY_KEY_RE в leo_analytics routers/ingest.py.
    private static final Pattern INGEST_KEY = Pattern.compile("^[A-Za-z0-9_\\-:.]{1,255}$");
    // Поля SiteDailyEvent в leo_analytics — ни больше ни меньше.
    private static final Set<String> SITE_DAILY_FIELDS = Set.of(
            "type", "date", "page_views", "sessions", "product_views", "marketplace_clicks",
            "add_to_cart", "add_to_favourite", "signups", "by_device", "by_locale", "by_marketplace");

    private HttpServer server;

    @AfterEach
    void stop() {
        if (server != null) server.stop(0);
    }

    private static SiteDayPoint day(LocalDate date, long views) {
        return new SiteDayPoint(date, views, 3, 2, 1, 0, 0, 0,
                Map.of("phone", views), Map.of("ru", views), Map.of("wildberries", 1L));
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> event(SiteDailyPublisher.Envelope envelope) {
        return ((List<Map<String, Object>>) envelope.body().get("events")).get(0);
    }

    @Test
    void theKeyCarriesTheRunStampSoTheSameDayCanBeSentAgain() {
        List<SiteDayPoint> days = List.of(day(DAY, 10));
        var morning = SiteDailyPublisher.envelopes(days, Map.of(), Instant.parse("2026-09-23T06:07:00Z"));
        var evening = SiteDailyPublisher.envelopes(days, Map.of(), Instant.parse("2026-09-23T18:07:00Z"));

        assertThat(morning.get(0).key()).startsWith("site_daily:2026-09-23:");
        assertThat(morning.get(0).key()).isNotEqualTo(evening.get(0).key());
        assertThat(morning.get(0).key()).matches(INGEST_KEY);
    }

    @Test
    void theDayEventHasExactlyTheFieldsTheIntakeKnows() {
        var envelope = SiteDailyPublisher.envelopes(List.of(day(DAY, 10)), Map.of(), Instant.now()).get(0);

        assertThat(envelope.body().keySet()).containsExactly("source", "captured_at", "events");
        assertThat(envelope.body().get("source")).isEqualTo("site");
        assertThat(event(envelope).keySet()).containsExactlyInAnyOrderElementsOf(SITE_DAILY_FIELDS);
        assertThat(event(envelope).get("date")).isEqualTo("2026-09-23");
    }

    @Test
    void pathsGoInChunksEachWithItsOwnKey() {
        Map<String, Long> paths = new HashMap<>();
        for (int i = 0; i < SiteDailyPublisher.PAGES_PER_CHUNK + 1; i++) paths.put("/ru/p" + i, (long) i + 1);
        var envelopes = SiteDailyPublisher.envelopes(List.of(day(DAY, 10)), Map.of(DAY, paths), Instant.now());

        assertThat(envelopes).hasSize(3);
        assertThat(envelopes.get(1).key()).startsWith("site_daily_pages:2026-09-23:").endsWith(":1");
        assertThat(envelopes.get(2).key()).endsWith(":2");
        assertThat(envelopes.get(2).key()).matches(INGEST_KEY);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> first = (List<Map<String, Object>>) event(envelopes.get(1)).get("rows");
        assertThat(first).hasSize(SiteDailyPublisher.PAGES_PER_CHUNK);
        assertThat(first.get(0)).containsEntry("path", "/ru/p500").containsEntry("views", 501L);
    }

    @Test
    void aDayWithoutViewsIsSentAsZerosButWithoutAnEmptyPathsChunk() {
        var envelopes = SiteDailyPublisher.envelopes(List.of(day(DAY, 0)), Map.of(DAY, Map.of()), Instant.now());

        assertThat(envelopes).hasSize(1);
        assertThat(event(envelopes.get(0))).containsEntry("page_views", 0L);
    }

    @Test
    void aPathLongerThanTheIntakeAllowsIsClipped() {
        String longPath = "/ru/" + "x".repeat(700);
        var envelopes = SiteDailyPublisher.envelopes(List.of(day(DAY, 1)), Map.of(DAY, Map.of(longPath, 1L)), Instant.now());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) event(envelopes.get(1)).get("rows");
        assertThat((String) rows.get(0).get("path")).hasSize(SiteDailyPublisher.MAX_PATH);
    }

    // --- Отправка по-настоящему, через сокет ---

    private record Seen(String key, String secret, String body) {}

    private String startServer(int status, List<Seen> seen) throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/api/v1/ingest", exchange -> {
            seen.add(new Seen(
                    exchange.getRequestHeaders().getFirst("Idempotency-Key"),
                    exchange.getRequestHeaders().getFirst("X-Ingest-Secret"),
                    new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8)));
            byte[] reply = "{\"detail\":\"conflict\"}".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(status, reply.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(reply);
            }
        });
        server.start();
        return "http://127.0.0.1:" + server.getAddress().getPort() + "/api/v1/ingest";
    }

    private static SiteStatsService statsFor(LocalDate day) {
        SiteStatsService stats = mock(SiteStatsService.class);
        when(stats.getDailyStats(any(LocalDate.class), any(LocalDate.class))).thenReturn(List.of(day(day, 5)));
        when(stats.getDailyPages(any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(Map.of(day, Map.of("/ru", 5L)));
        return stats;
    }

    @Test
    void acceptedEnvelopesCountAsSentAndCarrySecretAndKey() throws IOException {
        List<Seen> seen = new CopyOnWriteArrayList<>();
        String url = startServer(200, seen);
        var publisher = new SiteDailyPublisher(statsFor(DAY), new ObjectMapper(), url, "s3cret");

        var result = publisher.publish(DAY, DAY);

        assertThat(result.enabled()).isTrue();
        assertThat(result.sent()).isEqualTo(2);
        assertThat(result.failed()).isZero();
        assertThat(seen).extracting(Seen::secret).containsOnly("s3cret");
        assertThat(seen).extracting(Seen::key).allMatch(k -> INGEST_KEY.matcher(k).matches());
        assertThat(seen.get(0).body()).contains("\"type\":\"site_daily\"").contains("\"date\":\"2026-09-23\"");
    }

    @Test
    void aConflictIsAFailureNotAnAlreadyAcceptedDay() throws IOException {
        String url = startServer(409, new CopyOnWriteArrayList<>());
        var publisher = new SiteDailyPublisher(statsFor(DAY), new ObjectMapper(), url, "s3cret");

        var result = publisher.publish(DAY, DAY);

        assertThat(result.sent()).isZero();
        assertThat(result.failed()).isEqualTo(2);
        assertThat(result.failures().get(0)).contains("HTTP 409");
    }

    @Test
    void withoutAddressOrSecretNothingIsSentAndItSaysSo() throws IOException {
        List<Seen> seen = new ArrayList<>();
        String url = startServer(200, seen);

        var noSecret = new SiteDailyPublisher(statsFor(DAY), new ObjectMapper(), url, "").publish(DAY, DAY);
        var noUrl = new SiteDailyPublisher(statsFor(DAY), new ObjectMapper(), "", "s3cret").publish(DAY, DAY);

        assertThat(noSecret.enabled()).isFalse();
        assertThat(noUrl.enabled()).isFalse();
        assertThat(seen).isEmpty();
    }
}
