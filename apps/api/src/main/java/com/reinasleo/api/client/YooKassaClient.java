package com.reinasleo.api.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.util.UUID;

/**
 * Клиент YooKassa API v3. Basic auth (shopId:secretKey) и таймауты заданы
 * в RestClient bean'е (YooKassaConfig). Retries на createPayment нет
 * намеренно — идемпотентность обеспечивает Idempotence-Key, а повтор
 * решает вызывающий (юзер жмёт «оплатить» ещё раз → новый ключ).
 */
@Component
public class YooKassaClient {

    private static final Logger log = LoggerFactory.getLogger(YooKassaClient.class);

    private final RestClient restClient;

    public YooKassaClient(RestClient yooKassaRestClient) {
        this.restClient = yooKassaRestClient;
    }

    public YooKassaPaymentResponse createPayment(CreatePaymentRequest request, UUID idempotenceKey) {
        try {
            return restClient.post()
                    .uri("/payments")
                    .header("Idempotence-Key", idempotenceKey.toString())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(YooKassaPaymentResponse.class);
        } catch (RestClientResponseException e) {
            log.error("YooKassa createPayment failed: status={} body={}",
                    e.getStatusCode().value(), truncate(e.getResponseBodyAsString()));
            throw new YooKassaApiException(
                    "YooKassa createPayment failed with status " + e.getStatusCode().value(),
                    e.getStatusCode().value(), e);
        } catch (RestClientException e) {
            log.error("YooKassa createPayment transport error: {}", e.getMessage());
            throw new YooKassaApiException("YooKassa createPayment transport error", 0, e);
        }
    }

    public YooKassaPaymentResponse getPayment(String externalPaymentId) {
        try {
            return restClient.get()
                    .uri("/payments/{id}", externalPaymentId)
                    .retrieve()
                    .body(YooKassaPaymentResponse.class);
        } catch (RestClientResponseException e) {
            if (e.getStatusCode().value() != 404) {
                log.error("YooKassa getPayment failed: id={} status={} body={}",
                        externalPaymentId, e.getStatusCode().value(), truncate(e.getResponseBodyAsString()));
            }
            throw new YooKassaApiException(
                    "YooKassa getPayment failed with status " + e.getStatusCode().value(),
                    e.getStatusCode().value(), e);
        } catch (RestClientException e) {
            log.error("YooKassa getPayment transport error: id={} error={}", externalPaymentId, e.getMessage());
            throw new YooKassaApiException("YooKassa getPayment transport error", 0, e);
        }
    }

    private static String truncate(String s) {
        if (s == null) return null;
        return s.length() <= 300 ? s : s.substring(0, 300) + "...";
    }
}
