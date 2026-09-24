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

import java.time.LocalDate;
import java.util.List;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Соцсети — один список на весь сайт (подвал, контакты, разметка для
 * поисковиков). Владелец отмечает галочками, какие показывать.
 *
 * Круг: записал в админке → публичная ручка отдаёт ровно показанные → вернул.
 * Адреса уходят в подвал сайта, поэтому проверка строгая: только https и
 * только домен своей сети — опечатка или чужой адрес не должны доехать до
 * покупателя.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SiteSocialsControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository users;
    @Autowired private SiteConfigRepository siteConfig;
    @Autowired private JwtService jwtService;
    @Autowired private PasswordEncoder passwordEncoder;
    @MockBean private NextRevalidator nextRevalidator;

    private static final List<String> EMAILS = List.of("socials-admin@test.dev", "socials-buyer@test.dev");
    private String adminToken;
    private String buyerToken;

    @BeforeEach
    void setUp() {
        siteConfig.deleteById("social_links");
        adminToken = tokenFor("socials-admin@test.dev", "admin");
        buyerToken = tokenFor("socials-buyer@test.dev", "user");
    }

    @AfterEach
    void tearDown() {
        siteConfig.deleteById("social_links");
        EMAILS.forEach(e -> users.findByEmailIgnoreCase(e).ifPresent(users::delete));
    }

    private String tokenFor(String email, String role) {
        User user = new User(email, "Имя", "Фамилия", passwordEncoder.encode("Sup3rSecret!"),
                LocalDate.of(1990, 1, 1), false, true);
        user.setRole(role);
        user = users.save(user);
        return jwtService.generateToken(user.getId(), user.getEmail());
    }

    private static String body(String links) {
        return "{\"links\":" + links + "}";
    }

    private org.springframework.test.web.servlet.ResultActions save(String links) throws Exception {
        return mockMvc.perform(put("/api/admin/site/socials")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(links)));
    }

    // Пока владелец ничего не сохранял — те три, что были на сайте до 24.09.
    @Test
    void untouchedTheSiteShowsTheThreeItHadBefore() throws Exception {
        mockMvc.perform(get("/api/site/socials"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].network", contains("instagram", "telegram", "vk")));
    }

    @Test
    void theRoundTripOwnerSavesTheSiteShowsOnlyTheTickedOnesThenBack() throws Exception {
        save("[{\"network\":\"instagram\",\"href\":\"https://instagram.com/reinasleo\",\"shown\":false},"
                + "{\"network\":\"telegram\",\"href\":\"https://t.me/reinasleo\",\"shown\":true},"
                + "{\"network\":\"vk\",\"href\":\"https://vk.com/reinasleo\",\"shown\":true}]")
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/site/socials"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].network", contains("telegram", "vk")))
                .andExpect(jsonPath("$[0].href").value("https://t.me/reinasleo"))
                // наружу — только сеть и адрес, без служебной галочки
                .andExpect(jsonPath("$[0].shown").doesNotExist());

        // Админке — все три, с галочками: иначе снятую не вернуть.
        mockMvc.perform(get("/api/admin/site/socials").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.links", hasSize(3)))
                .andExpect(jsonPath("$.links[0].shown").value(false));

        save("[{\"network\":\"instagram\",\"href\":\"https://instagram.com/reinasleo\",\"shown\":true},"
                + "{\"network\":\"telegram\",\"href\":\"https://t.me/reinasleo\",\"shown\":true},"
                + "{\"network\":\"vk\",\"href\":\"https://vk.com/reinasleo\",\"shown\":true}]")
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/site/socials"))
                .andExpect(jsonPath("$[*].network", contains("instagram", "telegram", "vk")));
    }

    // Сохранение сбрасывает кэш витрины — иначе подвал обновится минут через
    // пятнадцать, и владелец решит, что галочка не сработала.
    @Test
    void savingDropsTheStorefrontCache() throws Exception {
        save("[{\"network\":\"telegram\",\"href\":\"https://t.me/reinasleo\",\"shown\":true}]")
                .andExpect(status().isOk());
        verify(nextRevalidator).storefrontChanged();
    }

    @Test
    void anEmptyListIsAllowedAndHidesThemAll() throws Exception {
        save("[]").andExpect(status().isOk());
        mockMvc.perform(get("/api/site/socials"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void onlyHttpsIsAccepted() throws Exception {
        save("[{\"network\":\"telegram\",\"href\":\"http://t.me/reinasleo\",\"shown\":true}]")
                .andExpect(status().isBadRequest());
        save("[{\"network\":\"telegram\",\"href\":\"javascript:alert(1)\",\"shown\":true}]")
                .andExpect(status().isBadRequest());
        verify(nextRevalidator, never()).storefrontChanged();
    }

    // Адрес обязан вести на домен СВОЕЙ сети: опечатка «t.me» → «t.rne» или
    // чужой сайт под видом Telegram до подвала не доедут.
    @Test
    void theAddressMustBeOnItsOwnNetworksDomain() throws Exception {
        save("[{\"network\":\"telegram\",\"href\":\"https://evil.example/reinasleo\",\"shown\":true}]")
                .andExpect(status().isBadRequest());
        save("[{\"network\":\"instagram\",\"href\":\"https://t.me/reinasleo\",\"shown\":true}]")
                .andExpect(status().isBadRequest());
        save("[{\"network\":\"vk\",\"href\":\"https://vk.com.evil.example/x\",\"shown\":true}]")
                .andExpect(status().isBadRequest());
        save("[{\"network\":\"telegram\",\"href\":\"https://user@t.me/reinasleo\",\"shown\":true}]")
                .andExpect(status().isBadRequest());
        save("[{\"network\":\"telegram\",\"href\":\"https://t.me/\",\"shown\":true}]")
                .andExpect(status().isBadRequest());
    }

    @Test
    void anUnknownNetworkOrATwiceListedOneIsRefused() throws Exception {
        save("[{\"network\":\"myspace\",\"href\":\"https://myspace.com/x\",\"shown\":true}]")
                .andExpect(status().isBadRequest());
        save("[{\"network\":\"vk\",\"href\":\"https://vk.com/a\",\"shown\":true},"
                + "{\"network\":\"vk\",\"href\":\"https://vk.com/b\",\"shown\":true}]")
                .andExpect(status().isBadRequest());
    }

    @Test
    void onlyTheAdminWrites() throws Exception {
        mockMvc.perform(put("/api/admin/site/socials")
                        .header("Authorization", "Bearer " + buyerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("[]")))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/admin/site/socials")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("[]")))
                .andExpect(status().isForbidden());
    }

    @Test
    void theSiteReadsWithoutSignIn() throws Exception {
        mockMvc.perform(get("/api/site/socials")).andExpect(status().isOk());
    }
}
