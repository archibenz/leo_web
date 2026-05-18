package com.reinasleo.api.controller;

import com.reinasleo.api.exception.OutOfStockException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RestExceptionHandlerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private RestExceptionHandler handler;

    @Test
    void missingRequiredHeader_returns400_notGeneric500() throws Exception {
        // POST /api/bot/check-user without X-Bot-Secret header used to fall through
        // to the catch-all Exception handler and return 500 "Unexpected error".
        // It must now be a 400 with a clear "missing_header" error code.
        mockMvc.perform(post("/api/bot/check-user")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"telegramId\":1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("missing_header"))
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("X-Bot-Secret")));
    }

    @Test
    void malformedJsonBody_returns400() throws Exception {
        // POST /api/auth/login with broken JSON used to bubble up as 500.
        // It should be a 400 with the malformed_body error code.
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{not valid json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("malformed_body"));
    }

    @Test
    void outOfStockException_envelopeUsesErrorField_notCode() {
        ResponseEntity<Map<String, Object>> response =
                handler.handleOutOfStock(new OutOfStockException("prod-123", 3, 1));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        Map<String, Object> body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body).containsEntry("error", "out_of_stock");
        assertThat(body).doesNotContainKey("code");
        assertThat(body).containsEntry("productId", "prod-123");
        assertThat(body).containsEntry("requested", 3);
        assertThat(body).containsEntry("available", 1);
        assertThat(body.get("message")).isInstanceOf(String.class);
    }

    @Test
    void illegalArgumentException_messageIsStable_doesNotEchoInternalDetail() {
        ResponseEntity<Map<String, Object>> withMessage =
                handler.handleIllegalArgument(new IllegalArgumentException("Product not found: xyz"));

        assertThat(withMessage.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(withMessage.getBody()).isNotNull();
        assertThat(withMessage.getBody()).containsEntry("error", "bad_request");
        assertThat(withMessage.getBody()).containsEntry("message", "Bad request");

        ResponseEntity<Map<String, Object>> nullMessage =
                handler.handleIllegalArgument(new IllegalArgumentException((String) null));

        assertThat(nullMessage.getBody()).isNotNull();
        assertThat(nullMessage.getBody()).containsEntry("error", "bad_request");
        assertThat(nullMessage.getBody()).containsEntry("message", "Bad request");
    }
}
