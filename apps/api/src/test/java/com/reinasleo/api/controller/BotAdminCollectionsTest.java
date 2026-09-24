package com.reinasleo.api.controller;

import com.reinasleo.api.repository.CollectionRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Коллекциями управляет телеграм-бот (меню «🗂 Коллекции» в leo_bot): заводит
 * их и привязывает к ним товары. Раздел «Коллекции» из админки сайта убран
 * 24.09 — сайт их не читает, а второй пульт к тем же данным только путал.
 * Этот тест стережёт, что у бота его пульт остался: заведение и список
 * работают по секрету, чужой секрет — отказ.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BotAdminCollectionsTest {

    private static final String BOT_SECRET = "test-bot-secret";
    private static final String NAME = "Бот-коллекция для теста";

    @Autowired private MockMvc mockMvc;
    @Autowired private CollectionRepository collections;

    @AfterEach
    void tearDown() {
        collections.findAll().stream()
                .filter(c -> NAME.equals(c.getName()))
                .forEach(collections::delete);
    }

    @Test
    void theBotCreatesACollectionAndSeesItInTheList() throws Exception {
        mockMvc.perform(post("/api/bot/admin/collections")
                        .header("X-Bot-Secret", BOT_SECRET)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + NAME + "\",\"description\":\"из бота\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value(NAME))
                .andExpect(jsonPath("$.id").exists());

        mockMvc.perform(get("/api/bot/admin/collections").header("X-Bot-Secret", BOT_SECRET))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].name", hasItem(NAME)));
    }

    @Test
    void aWrongSecretIsRefused() throws Exception {
        mockMvc.perform(get("/api/bot/admin/collections").header("X-Bot-Secret", "not-the-secret"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/bot/admin/collections")
                        .header("X-Bot-Secret", "not-the-secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + NAME + "\"}"))
                .andExpect(status().isUnauthorized());
    }
}
