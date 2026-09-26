package com.reinasleo.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

/**
 * Один конверт в приём аналитики (leo_analytics POST /api/v1/ingest). Общий
 * для дневных чисел и заказов: адрес, секрет и заголовки у них одни.
 *
 * Успех — только 2xx. 409 — провал, а не «уже принято»: ключи у отправителей
 * несут штамп прогона, и повтор ключа значит поломку (см. SiteDailyPublisher).
 */
public final class AnalyticsIngestClient {

    // HTTP/1.1 явно — см. NextRevalidator: HttpClient по умолчанию просит
    // апгрейд до h2c, и не всякий сервер его переносит.
    private final HttpClient http = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    private final ObjectMapper json;
    private final String url;
    private final String secret;

    public AnalyticsIngestClient(ObjectMapper json, String url, String secret) {
        this.json = json;
        this.url = url;
        this.secret = secret;
    }

    public boolean enabled() {
        return url != null && !url.isBlank() && secret != null && !secret.isBlank();
    }

    /** @return null при успехе, иначе причина провала для лога */
    public String send(String key, Map<String, Object> body) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(15))
                    .header("Content-Type", "application/json")
                    .header("X-Ingest-Secret", secret)
                    .header("Idempotency-Key", key)
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)))
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 == 2) return null;
            String text = response.body() == null ? "" : response.body();
            return "HTTP " + response.statusCode() + " " + text.substring(0, Math.min(text.length(), 300));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return "interrupted";
        } catch (Exception e) {
            return e.toString();
        }
    }
}
