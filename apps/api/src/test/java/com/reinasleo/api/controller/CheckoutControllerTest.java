package com.reinasleo.api.controller;

import com.reinasleo.api.client.YooKassaApiException;
import com.reinasleo.api.dto.CheckoutRequest;
import com.reinasleo.api.dto.CheckoutResponse;
import com.reinasleo.api.exception.CheckoutDisabledException;
import com.reinasleo.api.service.CheckoutService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CheckoutControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private CheckoutService checkoutService;

    private static final String VALID_BODY = """
            {
              "items": [{"productId": "prod-1", "size": "M", "qty": 2}],
              "email": "buyer@example.com",
              "phone": "+79991234567",
              "name": "Anna",
              "deliveryAddress": {"city": "Москва", "street": "Тверская", "house": "1", "apartment": "12"}
            }
            """;

    // Все запросы без Authorization — /api/checkout обязан быть permitAll
    // (guest checkout). 401/403 здесь означали бы сломанный SecurityConfig.
    //
    // X-Real-IP уникален на тест: MockMvc шлёт всё с 127.0.0.1, а checkout
    // лимитирован 5 req/min на IP — без разнесения по bucket'ам тесты
    // упираются в собственный rate limit.

    private ResultActions postCheckout(String ip, String body) throws Exception {
        return mockMvc.perform(post("/api/checkout")
                .header("X-Real-IP", ip)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    @Test
    void checkout_anonymousValidRequest_returnsOrderIdAndConfirmationUrl() throws Exception {
        UUID orderId = UUID.randomUUID();
        when(checkoutService.createOrder(any(CheckoutRequest.class), any()))
                .thenReturn(new CheckoutResponse(orderId, "https://yookassa.ru/confirm/yk-123"));

        postCheckout("10.1.0.1", VALID_BODY)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderId").value(orderId.toString()))
                .andExpect(jsonPath("$.confirmationUrl").value("https://yookassa.ru/confirm/yk-123"));
    }

    @Test
    void checkout_featureDisabled_returns503WithClearError() throws Exception {
        when(checkoutService.createOrder(any(CheckoutRequest.class), any()))
                .thenThrow(new CheckoutDisabledException());

        postCheckout("10.1.0.2", VALID_BODY)
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error").value("checkout_disabled"));
    }

    @Test
    void checkout_yooKassaDown_returns502() throws Exception {
        when(checkoutService.createOrder(any(CheckoutRequest.class), any()))
                .thenThrow(new YooKassaApiException("YooKassa createPayment transport error", 0));

        postCheckout("10.1.0.3", VALID_BODY)
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.error").value("payment_provider_error"));
    }

    @Test
    void checkout_missingEmail_returns400() throws Exception {
        postCheckout("10.1.0.4", """
                {
                  "items": [{"productId": "prod-1", "qty": 1}],
                  "phone": "+79991234567",
                  "deliveryAddress": {"city": "Москва", "street": "Тверская", "house": "1"}
                }
                """)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"));

        verifyNoInteractions(checkoutService);
    }

    @Test
    void checkout_emptyItems_returns400() throws Exception {
        postCheckout("10.1.0.5", """
                {
                  "items": [],
                  "email": "buyer@example.com",
                  "phone": "+79991234567",
                  "deliveryAddress": {"city": "Москва", "street": "Тверская", "house": "1"}
                }
                """)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"));

        verifyNoInteractions(checkoutService);
    }

    @Test
    void checkout_missingDeliveryAddress_returns400() throws Exception {
        postCheckout("10.1.0.6", """
                {
                  "items": [{"productId": "prod-1", "qty": 1}],
                  "email": "buyer@example.com",
                  "phone": "+79991234567"
                }
                """)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"));

        verifyNoInteractions(checkoutService);
    }

    @Test
    void checkout_sixthRequestFromSameIp_rateLimited429() throws Exception {
        when(checkoutService.createOrder(any(CheckoutRequest.class), any()))
                .thenReturn(new CheckoutResponse(UUID.randomUUID(), "https://yookassa.ru/confirm/yk-rl"));

        for (int i = 0; i < 5; i++) {
            postCheckout("10.1.0.99", VALID_BODY).andExpect(status().isOk());
        }
        postCheckout("10.1.0.99", VALID_BODY)
                .andExpect(status().isTooManyRequests());
    }
}
