package com.reinasleo.api.service.storefront;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Сброс кэша данных Next после публикации.
 *
 * Между правкой и покупателем три слоя: Caffeine 5 минут, `max-age=60` на
 * эндпоинте и `revalidate: 600` в Next. Они складываются — правка доезжает до
 * ~15 минут. @CacheEvict снимает первый слой, эта ручка — третий.
 *
 * Зовём СИНХРОННО и с короткими таймаутами: владелец нажал «Опубликовать» и
 * идёт смотреть результат, ответ ему нужен уже после сброса. Неудача пишется в
 * лог и не валит публикацию — правка в базе, кэш протухнет сам.
 */
@Component
public class NextRevalidator {

    private static final Logger log = LoggerFactory.getLogger(NextRevalidator.class);
    private static final String SECRET_HEADER = "X-Revalidate-Secret";

    // HTTP/1.1 ЯВНО. По умолчанию HttpClient берёт HTTP_2 и на открытом порту
    // сперва просит апгрейд до h2c. Node, на котором стоит Next, такого апгрейда
    // не умеет и рвёт соединение — запрос падает с «HTTP/1.1 header parser
    // received no bytes», сброс кэша не происходит, и правка доезжает до
    // покупателя не за минуту, а за десять. Поймано живьём: curl --http1.1 даёт
    // 200, curl --http2 к той же ручке — 000.
    private final HttpClient http = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(2))
            .build();

    @Value("${app.web.revalidate-url}")
    private String url;

    @Value("${app.web.revalidate-secret}")
    private String secret;

    public void storefrontChanged() {
        if (url == null || url.isBlank() || secret == null || secret.isBlank()) {
            log.warn("Storefront published but WEB_REVALIDATE_URL/REVALIDATE_SECRET are not set: "
                    + "the change will reach visitors when the Next cache expires, not within a minute");
            return;
        }
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(3))
                    .header("Content-Type", "application/json")
                    .header(SECRET_HEADER, secret)
                    .POST(HttpRequest.BodyPublishers.ofString("{\"tag\":\"storefront\"}"))
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                log.warn("Next refused to drop the storefront cache: HTTP {}", response.statusCode());
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Interrupted while dropping the Next storefront cache");
        } catch (Exception e) {
            log.warn("Failed to drop the Next storefront cache: {}", e.toString());
        }
    }
}
