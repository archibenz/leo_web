package com.reinasleo.api.client;

import com.reinasleo.api.config.YooKassaConfig;
import com.reinasleo.api.config.YooKassaProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class YooKassaClientTest {

    private static final YooKassaProperties PROPS =
            new YooKassaProperties("test-shop-id", "test-secret-key", true, "https://reinasleo.com");
    private static final String EXPECTED_BASIC_AUTH =
            "Basic " + HttpHeaders.encodeBasicAuth("test-shop-id", "test-secret-key", StandardCharsets.UTF_8);

    private MockRestServiceServer server;
    private YooKassaClient client;

    @BeforeEach
    void setUp() {
        // Тот же baseUrl + Basic auth что собирает YooKassaConfig, но поверх
        // MockRestServiceServer (bindTo должен идти ДО builder.build()).
        RestClient.Builder builder = RestClient.builder()
                .baseUrl(YooKassaConfig.BASE_URL)
                .defaultHeader(HttpHeaders.AUTHORIZATION, YooKassaConfig.basicAuth(PROPS));
        server = MockRestServiceServer.bindTo(builder).build();
        client = new YooKassaClient(builder.build());
    }

    private static CreatePaymentRequest createRequest() {
        return new CreatePaymentRequest(
                YooKassaAmount.rub(new BigDecimal("5000.00")),
                true,
                YooKassaConfirmationRequest.redirect("https://reinasleo.com/checkout/result?orderId=abc"),
                "Заказ REINASLEO abc",
                Map.of("orderId", "abc"),
                new YooKassaReceipt(
                        new YooKassaReceiptCustomer("buyer@example.com"),
                        List.of(YooKassaReceiptItem.commodity("Silk dress", 2,
                                YooKassaAmount.rub(new BigDecimal("2500.00"))))));
    }

    private static final String PAYMENT_JSON = """
            {
              "id": "yk-123",
              "status": "pending",
              "paid": false,
              "amount": {"value": "5000.00", "currency": "RUB"},
              "confirmation": {"type": "redirect", "confirmation_url": "https://yookassa.ru/confirm/yk-123"},
              "metadata": {"orderId": "abc"},
              "created_at": "2026-07-22T10:00:00.000Z",
              "test": true
            }
            """;

    @Test
    void createPayment_sendsBasicAuthIdempotenceKeyAndReceipt() {
        UUID key = UUID.randomUUID();
        server.expect(requestTo(YooKassaConfig.BASE_URL + "/payments"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, EXPECTED_BASIC_AUTH))
                .andExpect(header("Idempotence-Key", key.toString()))
                .andExpect(jsonPath("$.amount.value").value("5000.00"))
                .andExpect(jsonPath("$.amount.currency").value("RUB"))
                .andExpect(jsonPath("$.capture").value(true))
                .andExpect(jsonPath("$.confirmation.type").value("redirect"))
                .andExpect(jsonPath("$.confirmation.return_url")
                        .value("https://reinasleo.com/checkout/result?orderId=abc"))
                .andExpect(jsonPath("$.metadata.orderId").value("abc"))
                .andExpect(jsonPath("$.receipt.customer.email").value("buyer@example.com"))
                .andExpect(jsonPath("$.receipt.items[0].description").value("Silk dress"))
                .andExpect(jsonPath("$.receipt.items[0].quantity").value("2.00"))
                .andExpect(jsonPath("$.receipt.items[0].amount.value").value("2500.00"))
                .andExpect(jsonPath("$.receipt.items[0].vat_code").value(1))
                .andExpect(jsonPath("$.receipt.items[0].payment_subject").value("commodity"))
                .andExpect(jsonPath("$.receipt.items[0].payment_mode").value("full_payment"))
                .andRespond(withSuccess(PAYMENT_JSON, MediaType.APPLICATION_JSON));

        YooKassaPaymentResponse response = client.createPayment(createRequest(), key);

        assertThat(response.id()).isEqualTo("yk-123");
        assertThat(response.status()).isEqualTo("pending");
        assertThat(response.confirmation().confirmationUrl()).isEqualTo("https://yookassa.ru/confirm/yk-123");
        server.verify();
    }

    @Test
    void createPayment_serverError_throwsYooKassaApiException() {
        server.expect(requestTo(YooKassaConfig.BASE_URL + "/payments"))
                .andRespond(withServerError());

        assertThatThrownBy(() -> client.createPayment(createRequest(), UUID.randomUUID()))
                .isInstanceOf(YooKassaApiException.class)
                .satisfies(e -> assertThat(((YooKassaApiException) e).getStatus()).isEqualTo(500));
    }

    @Test
    void getPayment_parsesVerifiedPayment() {
        server.expect(requestTo(YooKassaConfig.BASE_URL + "/payments/yk-123"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, EXPECTED_BASIC_AUTH))
                .andRespond(withSuccess("""
                        {
                          "id": "yk-123",
                          "status": "succeeded",
                          "paid": true,
                          "amount": {"value": "5000.00", "currency": "RUB"},
                          "captured_at": "2026-07-22T10:15:30.000Z"
                        }
                        """, MediaType.APPLICATION_JSON));

        YooKassaPaymentResponse response = client.getPayment("yk-123");

        assertThat(response.status()).isEqualTo("succeeded");
        assertThat(response.paid()).isTrue();
        assertThat(response.capturedAt()).isEqualTo("2026-07-22T10:15:30.000Z");
        server.verify();
    }

    @Test
    void getPayment_notFound_throwsWithNotFoundFlag() {
        server.expect(requestTo(YooKassaConfig.BASE_URL + "/payments/yk-spoofed"))
                .andRespond(withStatus(HttpStatus.NOT_FOUND));

        assertThatThrownBy(() -> client.getPayment("yk-spoofed"))
                .isInstanceOf(YooKassaApiException.class)
                .satisfies(e -> assertThat(((YooKassaApiException) e).isNotFound()).isTrue());
    }
}
