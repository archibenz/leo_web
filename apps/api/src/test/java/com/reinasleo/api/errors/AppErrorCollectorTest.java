package com.reinasleo.api.errors;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Сборщик ошибок → приём аналитики. Сторожит то, что ломается молча:
 * 1. ПОВТОР — ОДНА ГРУППА со счётчиком, а не сто событий.
 * 2. ПРИЁМ НЕДОСТУПЕН — ошибки не теряются, а досылаются следующим прогоном.
 * 3. ПЕРЕПОЛНЕНИЕ — видно: выпавшее уходит событием app_error_dropped.
 * 4. ПОЛЯ — ровно контракт (у приёма extra="forbid"), без ПДн и секретов.
 */
class AppErrorCollectorTest {

    private static final Set<String> FIELDS = Set.of("type", "fingerprint", "app", "kind", "error_class", "message",
            "frames", "route", "method", "status", "count", "first_seen", "last_seen", "release", "env", "browser");

    private static final ObjectMapper JSON = new ObjectMapper();
    private final List<Map<String, Object>> received = new CopyOnWriteArrayList<>();
    private final AtomicInteger status = new AtomicInteger(200);
    private HttpServer server;
    private AppErrorCollector collector;

    @BeforeEach
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/api/v1/ingest", ex -> {
            @SuppressWarnings("unchecked")
            Map<String, Object> body = JSON.readValue(ex.getRequestBody(), Map.class);
            int code = status.get();
            if (code == 200) received.add(body);
            byte[] out = "{}".getBytes(StandardCharsets.UTF_8);
            ex.sendResponseHeaders(code, out.length);
            try (OutputStream o = ex.getResponseBody()) {
                o.write(out);
            }
        });
        server.start();
        collector = new AppErrorCollector(JSON, "http://127.0.0.1:" + server.getAddress().getPort() + "/api/v1/ingest",
                "secret", "abc123", "prod");
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> sentEvents() {
        return received.stream().flatMap(b -> ((List<Map<String, Object>>) b.get("events")).stream()).toList();
    }

    private static RuntimeException boom(String message) {
        return new IllegalStateException(message);
    }

    @Test
    void aRepeatedErrorIsOneGroupWithACount() {
        for (int i = 0; i < 3; i++) {
            collector.recordThrowable("exception", boom("order " + i + " exploded"), "GET", "/api/orders/{id}", 500);
        }
        collector.flush();

        assertThat(sentEvents()).singleElement().satisfies(e -> {
            assertThat(e.keySet()).isEqualTo(FIELDS);
            assertThat(e).containsEntry("type", "app_error").containsEntry("app", "site-api")
                    .containsEntry("kind", "exception").containsEntry("count", 3)
                    .containsEntry("route", "/api/orders/{id}").containsEntry("method", "GET")
                    .containsEntry("status", 500).containsEntry("release", "abc123").containsEntry("env", "prod")
                    .containsEntry("error_class", "java.lang.IllegalStateException");
            assertThat((List<?>) e.get("frames")).isNotEmpty()
                    .allSatisfy(f -> assertThat(f.toString()).startsWith("AppErrorCollectorTest."));
        });
        assertThat(received.get(0)).containsEntry("source", "site");
    }

    @Test
    void secretsAndPersonalDataDoNotLeave() throws Exception {
        collector.recordThrowable("exception",
                boom("user buyer@example.com token=abcdef123 sent eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.sig12345"),
                "POST", "/api/auth/login", 500);
        collector.flush();

        String raw = JSON.writeValueAsString(received);
        assertThat(raw).doesNotContain("buyer@example.com", "abcdef123", "eyJhbGciOiJIUzI1NiJ9");
    }

    @Test
    void whenTheIngestIsDownNothingIsLostAndTheNextRunDelivers() {
        status.set(503);
        collector.recordThrowable("exception", boom("x"), "GET", "/a", 500);
        collector.flush();
        assertThat(sentEvents()).isEmpty();
        assertThat(collector.size()).isEqualTo(1);

        collector.recordThrowable("exception", boom("x"), "GET", "/a", 500);
        status.set(200);
        collector.flush();

        assertThat(sentEvents()).singleElement().satisfies(e -> assertThat(e).containsEntry("count", 2));
        assertThat(collector.size()).isZero();
    }

    @Test
    void anOverflowIsReportedAsDroppedNotSilentlyLost() {
        Instant t = Instant.parse("2026-09-26T10:00:00Z");
        for (int i = 0; i < AppErrorCollector.MAX_GROUPS + 3; i++) {
            collector.record(new AppErrorCollector.AppError("site-web-client", "window_error", "E" + i, "m", List.of(),
                    null, null, null, null, null, 2, t.plusSeconds(i), t.plusSeconds(i)));
        }
        assertThat(collector.size()).isEqualTo(AppErrorCollector.MAX_GROUPS);

        collector.flush();

        List<Map<String, Object>> events = sentEvents();
        assertThat(events.stream().filter(e -> "app_error".equals(e.get("type")))).hasSize(AppErrorCollector.MAX_GROUPS);
        assertThat(events.stream().filter(e -> "app_error_dropped".equals(e.get("type")))).singleElement()
                .satisfies(d -> assertThat(d)
                        .containsEntry("count", 6) // три выпавшие группы по 2
                        .containsEntry("since", t.toString())
                        .containsEntry("until", t.plusSeconds(2).toString()));
        // 1000 событий + dropped — два конверта по пределу в 500.
        assertThat(received).hasSize(3);
    }

    @Test
    void withoutAnAddressNothingIsSentAndNothingBreaks() {
        AppErrorCollector off = new AppErrorCollector(JSON, "", "", "abc", "prod");
        off.recordThrowable("exception", boom("x"), "GET", "/a", 500);
        off.flush();
        assertThat(received).isEmpty();
    }

    @Test
    void anythingButProdIsDev() {
        AppErrorCollector local = new AppErrorCollector(JSON,
                "http://127.0.0.1:" + server.getAddress().getPort() + "/api/v1/ingest", "s", "abc", "staging");
        local.recordThrowable("exception", boom("x"), "GET", "/a", 500);
        local.flush();
        assertThat(sentEvents()).singleElement().satisfies(e -> assertThat(e).containsEntry("env", "dev"));
    }
}
