package com.reinasleo.api.controller;

import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.SiteConfigRepository;
import com.reinasleo.api.repository.UserRepository;
import com.reinasleo.api.security.JwtService;
import com.reinasleo.api.service.storefront.NextRevalidator;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * «Тексты сайта»: владелец правит заголовки и подписи витрины, русский и
 * английский парой. Хранятся только ПРАВКИ — пустое поле значит «как было»,
 * текст из перевода. Ключи — белый список: юридические тексты и служебные
 * подписи отсюда не правятся.
 *
 * Проверка безопасности на записи: длина, никаких угловых скобок, фигурные —
 * только как плейсхолдер {слово}. Совпадение плейсхолдеров с исходным текстом
 * сверяет витрина (сервер словаря не видит) и при расхождении показывает
 * исходный текст — страница не падает.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SiteTextsControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository users;
    @Autowired private SiteConfigRepository siteConfig;
    @Autowired private JwtService jwtService;
    @Autowired private PasswordEncoder passwordEncoder;
    @MockBean private NextRevalidator nextRevalidator;

    private static final List<String> EMAILS = List.of("texts-admin@test.dev", "texts-buyer@test.dev");
    private String adminToken;
    private String buyerToken;

    @BeforeEach
    void setUp() {
        siteConfig.deleteById("site_texts");
        adminToken = tokenFor("texts-admin@test.dev", "admin");
        buyerToken = tokenFor("texts-buyer@test.dev", "user");
    }

    @AfterEach
    void tearDown() {
        siteConfig.deleteById("site_texts");
        EMAILS.forEach(e -> users.findByEmailIgnoreCase(e).ifPresent(users::delete));
    }

    private String tokenFor(String email, String role) {
        User user = new User(email, "Имя", "Фамилия", passwordEncoder.encode("Sup3rSecret!"),
                LocalDate.of(1990, 1, 1), false, true);
        user.setRole(role);
        user = users.save(user);
        return jwtService.generateToken(user.getId(), user.getEmail());
    }

    private ResultActions save(String json) throws Exception {
        return mockMvc.perform(put("/api/admin/site/texts")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json));
    }

    @Test
    void untouchedThereAreNoEdits() throws Exception {
        mockMvc.perform(get("/api/site/texts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.texts").isEmpty())
                .andExpect(jsonPath("$.contactEmail").doesNotExist());
    }

    @Test
    void theRoundTripSavedEditsAreReadBackThenClearedToDefault() throws Exception {
        save("{\"texts\":{\"white.landing.theEdit\":{\"ru\":\"Выбор сезона\",\"en\":\"Season picks\"},"
                + "\"white.pdp.preorderBody\":{\"ru\":\"«{name}» закончилась — напишем.\",\"en\":\"\"}},"
                + "\"contactEmail\":\"hello@reinasleo.com\"}")
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/site/texts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.texts['white.landing.theEdit'].ru").value("Выбор сезона"))
                .andExpect(jsonPath("$.texts['white.landing.theEdit'].en").value("Season picks"))
                .andExpect(jsonPath("$.texts['white.pdp.preorderBody'].ru").value("«{name}» закончилась — напишем."))
                // пустой английский — «как было», а не пустая строка на сайте
                .andExpect(jsonPath("$.texts['white.pdp.preorderBody'].en").doesNotExist())
                .andExpect(jsonPath("$.contactEmail").value("hello@reinasleo.com"));

        save("{\"texts\":{},\"contactEmail\":\"\"}").andExpect(status().isOk());
        mockMvc.perform(get("/api/site/texts"))
                .andExpect(jsonPath("$.texts").isEmpty())
                .andExpect(jsonPath("$.contactEmail").doesNotExist());
    }

    @Test
    void savingDropsTheStorefrontCache() throws Exception {
        save("{\"texts\":{\"white.sets.title\":{\"ru\":\"Образы\"}}}").andExpect(status().isOk());
        verify(nextRevalidator).storefrontChanged();
    }

    // Белый список: юридические тексты и служебные подписи отсюда не правятся.
    @Test
    void aKeyOutsideTheListIsRefused() throws Exception {
        save("{\"texts\":{\"offer.sections.0.body\":{\"ru\":\"Всё бесплатно\"}}}").andExpect(status().isBadRequest());
        save("{\"texts\":{\"white.pdp.addToBag\":{\"ru\":\"Купить\"}}}").andExpect(status().isBadRequest());
        verify(nextRevalidator, never()).storefrontChanged();
    }

    @Test
    void markupAndStrayBracesAreRefused() throws Exception {
        save("{\"texts\":{\"white.sets.title\":{\"ru\":\"<b>Образы</b>\"}}}").andExpect(status().isBadRequest());
        save("{\"texts\":{\"white.sets.title\":{\"ru\":\"Образы {\"}}}").andExpect(status().isBadRequest());
        save("{\"texts\":{\"white.sets.title\":{\"ru\":\"Образы }\"}}}").andExpect(status().isBadRequest());
        save("{\"texts\":{\"white.pdp.preorderBody\":{\"ru\":\"'{name}' нет\"}}}").andExpect(status().isBadRequest());
    }

    @Test
    void aPlaceholderWordIsAllowedButNothingElseInBraces() throws Exception {
        save("{\"texts\":{\"white.pdp.preorderBody\":{\"ru\":\"Вещь {name} закончилась\"}}}")
                .andExpect(status().isOk());
        save("{\"texts\":{\"white.pdp.preorderBody\":{\"ru\":\"Вещь {name, select}\"}}}")
                .andExpect(status().isBadRequest());
    }

    @Test
    void tooLongIsRefused() throws Exception {
        save("{\"texts\":{\"white.landing.theEdit\":{\"ru\":\"" + "а".repeat(61) + "\"}}}")
                .andExpect(status().isBadRequest());
    }

    @Test
    void aBadEmailIsRefused() throws Exception {
        save("{\"texts\":{},\"contactEmail\":\"not-an-email\"}").andExpect(status().isBadRequest());
        save("{\"texts\":{},\"contactEmail\":\"a@b.c<script>\"}").andExpect(status().isBadRequest());
    }

    @Test
    void onlyTheAdminWritesAndTheSiteReadsWithoutSignIn() throws Exception {
        mockMvc.perform(put("/api/admin/site/texts")
                        .header("Authorization", "Bearer " + buyerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"texts\":{}}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/site/texts")).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/site/texts")).andExpect(status().isOk());
    }
}
