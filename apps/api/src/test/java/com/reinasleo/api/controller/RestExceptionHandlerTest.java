package com.reinasleo.api.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RestExceptionHandlerTest {

    @Autowired private MockMvc mockMvc;

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
}
