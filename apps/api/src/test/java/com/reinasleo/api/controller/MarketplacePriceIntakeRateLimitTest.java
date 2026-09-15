package com.reinasleo.api.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Сторож на сам сторож. Остальной набор гоняется с поднятой планкой
// (application-test.yml: 1000/мин), иначе четырнадцать обращений одного
// класса срезались бы боевым пределом 10/мин. Здесь планка своя и низкая —
// два запроса в минуту, — и тест доказывает, что предел ДЕЙСТВИТЕЛЬНО
// срабатывает, а не просто настроен.
//
// Зачем предел вообще: путь стоит под permitAll (реальная проверка — секрет
// в контроллере), nginx уводит на Spring все /api/*, значит ручка достижима
// снаружи, а тело разбирается РАНЬШЕ, чем сверяется секрет — @RequestBody
// резолвится до входа в метод. Без предела чужой может гонять разбор пачек
// до 500 строк, не зная секрета вовсе.
//
// Проверяем НЕВЕРНЫМ секретом намеренно: отказ по частоте обязан случиться
// раньше, чем отказ по секрету, — иначе предел не защищает от того, ради
// чего поставлен.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = "app.rate-limit.integrations-per-minute=2")
class MarketplacePriceIntakeRateLimitTest {

    private static final String PATH = "/api/integrations/marketplace-prices";
    private static final String BODY = "{\"items\":[]}";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void theThirdCallWithinAMinuteIsThrottled_evenWithAWrongSecret() throws Exception {
        for (int i = 0; i < 2; i++) {
            mockMvc.perform(post(PATH)
                            .header("X-Pricing-Secret", "wrong-secret-on-purpose")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(BODY))
                    .andExpect(not429());
        }

        // Третий — уже за пределом. 429 и Retry-After по RFC 6585 §4.
        mockMvc.perform(post(PATH)
                        .header("X-Pricing-Secret", "wrong-secret-on-purpose")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"));
    }

    // Первые два вызова нас интересуют только тем, что они НЕ 429: какой
    // именно отказ отдаст контроллер на неверный секрет — предмет другого
    // теста, и привязываться к нему здесь значило бы связать два сторожа.
    private static org.springframework.test.web.servlet.ResultMatcher not429() {
        return result -> {
            int status = result.getResponse().getStatus();
            if (status == 429) {
                throw new AssertionError("предел сработал раньше времени: " + status);
            }
        };
    }
}
