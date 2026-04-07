package com.reinasleo.api.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityConfigTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ApplicationContext applicationContext;

    // ---- Regression: default Spring Security user must not exist ----

    @Test
    void noUserDetailsServiceBean() {
        // Excluding UserDetailsServiceAutoConfiguration in @SpringBootApplication
        // is the only thing keeping Spring Boot from creating an in-memory user
        // with a generated password and logging it on every startup.
        // This test fails loudly if the exclude is removed.
        assertTrue(
                applicationContext.getBeansOfType(UserDetailsService.class).isEmpty(),
                "no UserDetailsService bean should exist; default user means a generated password is being logged");
    }

    // ---- Public read endpoints ----

    @Test
    void healthEndpoint_isPublic() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk());
    }

    @Test
    void lookbookEndpoint_isPublic() throws Exception {
        int status = mockMvc.perform(get("/api/lookbook"))
                .andReturn().getResponse().getStatus();
        assertNotEquals(401, status, "lookbook must not be 401");
        assertNotEquals(403, status, "lookbook must not be 403");
    }

    @Test
    void catalogEndpoint_isAccessibleWithoutAuth() throws Exception {
        // permitAll. May return 500 in test profile because H2 doesn't fully
        // model the Postgres array types used by the catalog query — that is
        // expected and proves the request reached the controller layer rather
        // than being rejected at the security layer.
        mockMvc.perform(get("/api/catalog/products"))
                .andExpect(status().is5xxServerError());
    }

    @Test
    void careGuidesEndpoint_isPublic() throws Exception {
        int status = mockMvc.perform(get("/api/care-guides"))
                .andReturn().getResponse().getStatus();
        assertNotEquals(401, status, "care-guides must not be 401");
        assertNotEquals(403, status, "care-guides must not be 403");
    }

    @Test
    void careGuidesSlugEndpoint_isPublicAtSecurityLayer() throws Exception {
        // /api/care-guides/{slug} doesn't have a controller mapping yet, so
        // Spring will return 404. The point is: it must not be blocked at the
        // security layer with 401/403.
        int status = mockMvc.perform(get("/api/care-guides/how-to-wash-silk"))
                .andReturn().getResponse().getStatus();
        assertNotEquals(401, status, "care-guides/{slug} must not be 401");
        assertNotEquals(403, status, "care-guides/{slug} must not be 403");
    }

    @Test
    void actuatorHealth_isPublic() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk());
    }

    // ---- Public POST endpoints (rate-limited or secret-protected) ----

    @Test
    void contactEndpoint_isPublicAtSecurityLayer() throws Exception {
        int status = mockMvc.perform(post("/api/contact")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andReturn().getResponse().getStatus();
        // 400 from validation is fine — proves we passed Spring Security.
        assertNotEquals(401, status, "contact must not be 401");
        assertNotEquals(403, status, "contact must not be 403");
    }

    @Test
    void authLoginEndpoint_isPublicAtSecurityLayer() throws Exception {
        int status = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andReturn().getResponse().getStatus();
        assertNotEquals(401, status, "auth/login must not be 401 from security layer");
        assertNotEquals(403, status, "auth/login must not be 403 from security layer");
    }

    @Test
    void authMeEndpoint_isPublicAtSecurityLayer() throws Exception {
        // /api/auth/me is permitAll — controller decides whether the user is
        // logged in based on the SecurityContext that JwtAuthFilter populates.
        int status = mockMvc.perform(get("/api/auth/me"))
                .andReturn().getResponse().getStatus();
        assertNotEquals(403, status, "auth/me must not be 403 from security layer");
    }

    @Test
    void telegramInitEndpoint_isPublicAtSecurityLayer() throws Exception {
        int status = mockMvc.perform(post("/api/auth/telegram/init")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andReturn().getResponse().getStatus();
        assertNotEquals(401, status, "telegram/init must not be 401 from security layer");
        assertNotEquals(403, status, "telegram/init must not be 403 from security layer");
    }

    @Test
    void botEndpoint_isPublicAtSecurityLayer() throws Exception {
        // Spring Security must let bot endpoints through; the controller's own
        // X-Bot-Secret check (MessageDigest.isEqual) rejects unauthorised callers.
        // Here we only assert the security layer didn't block the request.
        int status = mockMvc.perform(post("/api/bot/check-user")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"telegramId\":1}"))
                .andReturn().getResponse().getStatus();
        assertNotEquals(403, status, "bot endpoint must not be 403 from security layer");
    }

    @Test
    void botAdminEndpoint_isPublicAtSecurityLayer() throws Exception {
        // Same idea for /api/bot/admin/** — must reach the controller, where
        // X-Bot-Secret enforcement happens.
        int status = mockMvc.perform(get("/api/bot/admin/dashboard"))
                .andReturn().getResponse().getStatus();
        assertNotEquals(403, status, "bot/admin must not be 403 from security layer");
    }

    // ---- Authenticated endpoints ----

    @Test
    void meEndpoint_requiresAuth() throws Exception {
        mockMvc.perform(get("/api/me/cart"))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminEndpoint_requiresAuth() throws Exception {
        mockMvc.perform(get("/api/admin/products"))
                .andExpect(status().isForbidden());
    }

    // ---- Catch-all denyAll ----

    @Test
    void unknownRoute_isDeniedByDefault() throws Exception {
        mockMvc.perform(get("/api/this-route-does-not-exist"))
                .andExpect(status().isForbidden());
    }
}
