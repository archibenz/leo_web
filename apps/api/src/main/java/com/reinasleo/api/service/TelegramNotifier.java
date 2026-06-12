package com.reinasleo.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

/**
 * Отправка системных сообщений в Telegram-бот (одноразовые коды для удаления
 * аккаунта, уведомления «снова в наличии»). Реальный HTTP-вызов на
 * {@code https://api.telegram.org/bot<token>/sendMessage}.
 *
 * <p>Контракт: метод никогда не бросает исключений — endpoint /delete-challenge
 * всегда возвращает 202; user может повторить запрос, если сообщение не дошло.</p>
 */
@Service
public class TelegramNotifier {

    private static final Logger log = LoggerFactory.getLogger(TelegramNotifier.class);
    private static final String TELEGRAM_API_BASE = "https://api.telegram.org";

    private static final int MAX_ATTEMPTS = 3;
    private static final long BACKOFF_MILLIS = 500L;

    private static final String SEND_METRIC = "reinasleo.tg.notifier.send";

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String apiBaseUrl;

    private final Counter successCounter;
    private final Counter clientErrorCounter;
    private final Counter serverErrorCounter;
    private final Counter transportErrorCounter;
    private final Counter skippedCounter;

    @Value("${app.telegram.bot-token}")
    private String botToken;

    @Autowired
    public TelegramNotifier(MeterRegistry meters) {
        this(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build(),
                new ObjectMapper(), TELEGRAM_API_BASE, meters);
    }

    // Тестовый конструктор: позволяет подменить HttpClient (WireMock / MockWebServer)
    // и base URL, при этом @Value-инъекция botToken остаётся через reflection в тестах.
    TelegramNotifier(HttpClient httpClient, ObjectMapper objectMapper, String apiBaseUrl,
                     MeterRegistry meters) {
        this.httpClient = httpClient;
        this.objectMapper = objectMapper;
        this.apiBaseUrl = apiBaseUrl;
        this.successCounter = sendCounter(meters, "success");
        this.clientErrorCounter = sendCounter(meters, "client_error");
        this.serverErrorCounter = sendCounter(meters, "server_error");
        this.transportErrorCounter = sendCounter(meters, "transport_error");
        this.skippedCounter = sendCounter(meters, "skipped");
    }

    private static Counter sendCounter(MeterRegistry meters, String outcome) {
        return Counter.builder(SEND_METRIC)
                .tag("outcome", outcome)
                .register(meters);
    }

    public void sendDeleteChallenge(Long telegramId, String code) {
        if (telegramId == null) {
            log.warn("delete_challenge.send_skipped reason=null_telegram_id");
            skippedCounter.increment();
            return;
        }
        if (botToken == null || botToken.isBlank()) {
            log.error("delete_challenge.send_failed reason=missing_bot_token telegram_id={}", telegramId);
            skippedCounter.increment();
            return;
        }
        if (code == null || code.isEmpty()) {
            log.warn("delete_challenge.send_skipped reason=empty_code telegram_id={}", telegramId);
            skippedCounter.increment();
            return;
        }

        String text = """
                Ваш код для удаления аккаунта: %s
                Your account deletion code: %s

                Действует 5 минут / Valid for 5 minutes.""".formatted(code, code);

        Map<String, Object> payload = Map.of(
                "chat_id", telegramId,
                "text", text
        );

        String jsonBody;
        try {
            jsonBody = objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            log.error("delete_challenge.send_failed reason=serialize_error telegram_id={}", telegramId, e);
            transportErrorCounter.increment();
            return;
        }

        URI uri = URI.create(apiBaseUrl + "/bot" + botToken + "/sendMessage");
        sendWithRetry(uri, jsonBody, telegramId, "delete_challenge");
    }

    public void sendBackInStock(Long telegramId, String productTitle, String productUrl) {
        if (telegramId == null) {
            log.warn("back_in_stock.send_skipped reason=null_telegram_id");
            skippedCounter.increment();
            return;
        }
        if (botToken == null || botToken.isBlank()) {
            log.error("back_in_stock.send_failed reason=missing_bot_token telegram_id={}", telegramId);
            skippedCounter.increment();
            return;
        }

        String text = """
                Снова в наличии: %s
                Back in stock: %s

                %s""".formatted(productTitle, productTitle, productUrl);

        Map<String, Object> payload = Map.of(
                "chat_id", telegramId,
                "text", text
        );

        String jsonBody;
        try {
            jsonBody = objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            log.error("back_in_stock.send_failed reason=serialize_error telegram_id={}", telegramId, e);
            transportErrorCounter.increment();
            return;
        }

        URI uri = URI.create(apiBaseUrl + "/bot" + botToken + "/sendMessage");
        sendWithRetry(uri, jsonBody, telegramId, "back_in_stock");
    }

    private void sendWithRetry(URI uri, String jsonBody, Long telegramId, String logEvent) {
        boolean transportErrorSeen = false;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(uri)
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            try {
                HttpResponse<String> response = httpClient.send(
                        request, HttpResponse.BodyHandlers.ofString());
                int status = response.statusCode();

                if (status >= 200 && status < 300) {
                    log.info("{}.sent telegram_id={} attempt={}", logEvent, telegramId, attempt);
                    successCounter.increment();
                    return;
                }

                if (status >= 400 && status < 500) {
                    // Невалидный токен, чат не существует, бот не запущен у юзера —
                    // не ретраим, юзер всё равно может попробовать снова.
                    log.warn("{}.bot_api_4xx telegram_id={} status={} body={}",
                            logEvent, telegramId, status, truncate(response.body(), 200));
                    clientErrorCounter.increment();
                    return;
                }

                transportErrorSeen = false;
                log.warn("{}.bot_api_5xx telegram_id={} status={} attempt={}/{}",
                        logEvent, telegramId, status, attempt, MAX_ATTEMPTS);
            } catch (IOException e) {
                transportErrorSeen = true;
                log.warn("{}.io_error telegram_id={} attempt={}/{} message={}",
                        logEvent, telegramId, attempt, MAX_ATTEMPTS, e.getMessage());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.error("{}.interrupted telegram_id={}", logEvent, telegramId);
                transportErrorCounter.increment();
                return;
            }

            if (attempt < MAX_ATTEMPTS) {
                try {
                    Thread.sleep(BACKOFF_MILLIS);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    transportErrorCounter.increment();
                    return;
                }
            }
        }

        log.error("{}.send_failed telegram_id={} attempts={} reason=exhausted",
                logEvent, telegramId, MAX_ATTEMPTS);
        if (transportErrorSeen) {
            transportErrorCounter.increment();
        } else {
            serverErrorCounter.increment();
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max) + "...";
    }
}
