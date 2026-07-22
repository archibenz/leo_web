package com.reinasleo.api.controller;

import com.reinasleo.api.service.PaymentWebhookService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class YooKassaWebhookControllerTest {

    private static final String WEBHOOK_PATH = "/api/payments/yookassa/webhook";

    @Autowired private MockMvc mockMvc;
    @MockBean private PaymentWebhookService webhookService;

    // Запросы без auth — маршрут должен быть permitAll (YooKassa не шлёт
    // наших токенов; защита — verify-by-fetch в сервисе, не на route).

    @Test
    void webhook_validNotification_returns200AndDelegates() throws Exception {
        mockMvc.perform(post(WEBHOOK_PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "notification",
                                  "event": "payment.succeeded",
                                  "object": {"id": "yk-1", "status": "succeeded"}
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"));

        verify(webhookService).process("payment.succeeded", "yk-1");
    }

    @Test
    void webhook_missingObjectId_returns400() throws Exception {
        mockMvc.perform(post(WEBHOOK_PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"event": "payment.succeeded", "object": {}}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("malformed_webhook"));

        verifyNoInteractions(webhookService);
    }

    @Test
    void webhook_missingEvent_returns400() throws Exception {
        mockMvc.perform(post(WEBHOOK_PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"object": {"id": "yk-1"}}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("malformed_webhook"));

        verifyNoInteractions(webhookService);
    }

    @Test
    void webhook_objectNotAMap_returns400() throws Exception {
        mockMvc.perform(post(WEBHOOK_PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"event": "payment.succeeded", "object": "yk-1"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("malformed_webhook"));

        verifyNoInteractions(webhookService);
    }

    @Test
    void webhook_malformedJson_returns400() throws Exception {
        mockMvc.perform(post(WEBHOOK_PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{not valid json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("malformed_body"));

        verifyNoInteractions(webhookService);
    }
}
