package com.reinasleo.api.controller;

import com.reinasleo.api.dto.BotCheckUserResponse;
import com.reinasleo.api.service.BotAuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BotControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private BotAuthService botAuthService;

    @Test
    void checkUser_withValidSecret_returns200() throws Exception {
        when(botAuthService.checkUser(anyLong()))
                .thenReturn(new BotCheckUserResponse(true, "John Doe"));

        mockMvc.perform(post("/api/bot/check-user")
                        .header("X-Bot-Secret", "test-bot-secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"telegramId": 12345}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.registered").value(true))
                .andExpect(jsonPath("$.name").value("John Doe"));
    }

    @Test
    void checkUser_withoutSecret_rejectsRequest() throws Exception {
        mockMvc.perform(post("/api/bot/check-user")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"telegramId": 12345}
                                """))
                .andExpect(status().isInternalServerError());
    }

    @Test
    void checkUser_withWrongSecret_returns401() throws Exception {
        mockMvc.perform(post("/api/bot/check-user")
                        .header("X-Bot-Secret", "wrong-secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"telegramId": 12345}
                                """))
                .andExpect(status().isUnauthorized());
    }
}
