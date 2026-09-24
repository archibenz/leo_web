package com.reinasleo.api.controller;

import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.UserRepository;
import com.reinasleo.api.security.JwtService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Дверь дашборда аналитики. nginx спрашивает эту ручку подзапросом на КАЖДЫЙ
 * запрос к /analytics и пересылает куки браузера как есть. Поэтому главный
 * путь здесь — кука rl_session, а не заголовок Bearer: именно её перешлёт
 * nginx.
 *
 * Проверка настоящая, на сервере: подпись и срок токена, живая учётка
 * (findActiveById), роль admin. «Кука есть» ничего не значит.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminSessionControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository users;
    @Autowired private JwtService jwtService;
    @Autowired private PasswordEncoder passwordEncoder;

    private static final List<String> EMAILS = List.of(
            "door-admin@test.dev", "door-buyer@test.dev", "door-gone@test.dev");

    private User admin;
    private User buyer;

    @BeforeEach
    void setUp() {
        admin = save("door-admin@test.dev", "admin");
        buyer = save("door-buyer@test.dev", "user");
    }

    @AfterEach
    void tearDown() {
        EMAILS.forEach(e -> users.findByEmailIgnoreCase(e).ifPresent(users::delete));
    }

    private User save(String email, String role) {
        User user = new User(email, "Имя", "Фамилия", passwordEncoder.encode("Sup3rSecret!"),
                LocalDate.of(1990, 1, 1), false, true);
        user.setRole(role);
        return users.save(user);
    }

    private String tokenOf(User user) {
        return jwtService.generateToken(user.getId(), user.getEmail());
    }

    @Test
    void anAdminSessionCookieOpensTheDoor() throws Exception {
        mockMvc.perform(get("/api/admin/session").cookie(new Cookie("rl_session", tokenOf(admin))))
                .andExpect(status().isNoContent())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")))
                .andExpect(content().string(""));
    }

    @Test
    void aBuyerIsTurnedAway() throws Exception {
        mockMvc.perform(get("/api/admin/session").cookie(new Cookie("rl_session", tokenOf(buyer))))
                .andExpect(status().isForbidden());
    }

    @Test
    void noCookieIsTurnedAway() throws Exception {
        mockMvc.perform(get("/api/admin/session"))
                .andExpect(status().isForbidden());
    }

    // Кука с чем угодно — не пропуск: nginx проверяет не наличие, а ответ.
    @Test
    void aForgedCookieIsTurnedAway() throws Exception {
        mockMvc.perform(get("/api/admin/session").cookie(new Cookie("rl_session", "not-a-token")))
                .andExpect(status().isForbidden());
    }

    // Токен подписан верно и не истёк, а учётки больше нет — дверь закрыта
    // сразу, а не когда истечёт токен. Ради этого проверка и живёт на сайте, а
    // не в аналитике с копией секрета JWT.
    @Test
    void aDeletedAdminIsTurnedAwayAtOnce() throws Exception {
        User gone = save("door-gone@test.dev", "admin");
        String token = tokenOf(gone);
        gone.setDeletedAt(Instant.now());
        users.save(gone);

        mockMvc.perform(get("/api/admin/session").cookie(new Cookie("rl_session", token)))
                .andExpect(status().isForbidden());
    }

    @Test
    void aDemotedAdminIsTurnedAwayAtOnce() throws Exception {
        String token = tokenOf(admin);
        admin.setRole("user");
        users.save(admin);

        mockMvc.perform(get("/api/admin/session").cookie(new Cookie("rl_session", token)))
                .andExpect(status().isForbidden());
    }

    @Test
    void aTokenForAnUnknownUserIsTurnedAway() throws Exception {
        String token = jwtService.generateToken(UUID.randomUUID(), "nobody@test.dev");
        mockMvc.perform(get("/api/admin/session").cookie(new Cookie("rl_session", token)))
                .andExpect(status().isForbidden());
    }
}
