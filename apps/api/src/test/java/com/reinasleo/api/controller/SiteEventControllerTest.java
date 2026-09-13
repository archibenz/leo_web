package com.reinasleo.api.controller;

import com.reinasleo.api.model.SiteEvent;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.SiteEventRepository;
import com.reinasleo.api.repository.UserRepository;
import com.reinasleo.api.security.AuthCookies;
import com.reinasleo.api.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Full stack (real SiteEventRepository, real SecurityConfig/RateLimitFilter) —
// the acceptance criteria are about actual DB rows and actual HTTP status
// codes, not about what a mock was told to return. Each test uses its own
// X-Real-IP (see CheckoutControllerTest for why: RateLimitFilter buckets by
// IP, and MockMvc otherwise sends every request from 127.0.0.1).
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SiteEventControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private SiteEventRepository siteEventRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;

    @BeforeEach
    void setUp() {
        siteEventRepository.deleteAll();
        userRepository.deleteAll();
    }

    private ResultActions postEvents(String ip, String body) throws Exception {
        return mockMvc.perform(post("/api/events")
                .header("X-Real-IP", ip)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private User savedUser(String email) {
        User user = new User(email, "Alice", "Smith", passwordEncoder.encode("Sup3rSecret!"),
                LocalDate.of(1990, 1, 1), false, true);
        return userRepository.save(user);
    }

    @Test
    void submit_validBatch_returns202EmptyBodyAndPersistsRows() throws Exception {
        String body = """
                {"events":[
                    {"eventType":"page_view","path":"/ru","locale":"ru","device":"desktop"},
                    {"eventType":"product_view","productId":"wb-123","modelId":"%s","sessionKey":"sess-abc"}
                ]}
                """.formatted(UUID.randomUUID());

        postEvents("10.2.0.1", body)
                .andExpect(status().isAccepted())
                .andExpect(content().string(""));

        List<SiteEvent> saved = siteEventRepository.findAll();
        assertThat(saved).hasSize(2);
        SiteEvent productView = saved.stream().filter(e -> "product_view".equals(e.getEventType())).findFirst().orElseThrow();
        // Вариант, не модель: productId это products.id ('wb-123'), а не product_models.id.
        assertThat(productView.getProductId()).isEqualTo("wb-123");
        assertThat(productView.getSessionKey()).isEqualTo("sess-abc");
    }

    @Test
    void submit_unknownEventType_returns400AndPersistsNothing() throws Exception {
        String body = """
                {"events":[{"eventType":"delete_account"}]}
                """;

        postEvents("10.2.0.2", body)
                .andExpect(status().isBadRequest());

        assertThat(siteEventRepository.findAll()).isEmpty();
    }

    @Test
    void submit_batchOf21_returns400WhollyRejected() throws Exception {
        StringBuilder events = new StringBuilder();
        for (int i = 0; i < 21; i++) {
            if (i > 0) events.append(',');
            events.append("{\"eventType\":\"page_view\"}");
        }
        String body = "{\"events\":[" + events + "]}";

        postEvents("10.2.0.3", body)
                .andExpect(status().isBadRequest());

        assertThat(siteEventRepository.findAll()).isEmpty();
    }

    @Test
    void submit_batchOf20_isAccepted() throws Exception {
        StringBuilder events = new StringBuilder();
        for (int i = 0; i < 20; i++) {
            if (i > 0) events.append(',');
            events.append("{\"eventType\":\"page_view\"}");
        }
        String body = "{\"events\":[" + events + "]}";

        postEvents("10.2.0.4", body).andExpect(status().isAccepted());

        assertThat(siteEventRepository.findAll()).hasSize(20);
    }

    @Test
    void submit_withoutAuth_isPermitted() throws Exception {
        postEvents("10.2.0.5", """
                {"events":[{"eventType":"page_view"}]}
                """)
                .andExpect(status().isAccepted());
    }

    @Test
    void submit_viewEventWhileAuthenticated_neverAttachesUserId() throws Exception {
        User user = savedUser("viewer@example.com");
        String token = jwtService.generateToken(user.getId(), user.getEmail());

        mockMvc.perform(post("/api/events")
                        .header("X-Real-IP", "10.2.0.6")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"events":[
                                    {"eventType":"page_view"},
                                    {"eventType":"product_view","productId":"wb-999"},
                                    {"eventType":"marketplace_click","productId":"wb-999","marketplace":"wildberries"}
                                ]}
                                """))
                .andExpect(status().isAccepted());

        List<SiteEvent> saved = siteEventRepository.findAll();
        assertThat(saved).hasSize(3);
        assertThat(saved).allMatch(e -> e.getUserId() == null,
                "view/click events must never carry user_id, even when the requester is authenticated");
    }

    @Test
    void submit_addToCartWhileAuthenticated_attachesUserId() throws Exception {
        User user = savedUser("cart-owner@example.com");
        String token = jwtService.generateToken(user.getId(), user.getEmail());

        mockMvc.perform(post("/api/events")
                        .header("X-Real-IP", "10.2.0.7")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"events":[{"eventType":"add_to_cart","productId":"wb-42"}]}
                                """))
                .andExpect(status().isAccepted());

        SiteEvent saved = siteEventRepository.findAll().get(0);
        assertThat(saved.getUserId()).isEqualTo(user.getId());
    }

    @Test
    void submit_addToCartViaSessionCookie_attachesUserId() throws Exception {
        // sendBeacon cannot set custom headers, so the live frontend can only
        // authenticate via the httpOnly rl_session cookie, never the Bearer
        // header used in the other tests here — this proves that path works too.
        User user = savedUser("cookie-owner@example.com");
        String token = jwtService.generateToken(user.getId(), user.getEmail());

        mockMvc.perform(post("/api/events")
                        .header("X-Real-IP", "10.2.0.8")
                        .cookie(new jakarta.servlet.http.Cookie(AuthCookies.SESSION_COOKIE, token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"events":[{"eventType":"add_to_favourite","productId":"wb-7"}]}
                                """))
                .andExpect(status().isAccepted());

        SiteEvent saved = siteEventRepository.findAll().get(0);
        assertThat(saved.getUserId()).isEqualTo(user.getId());
    }

    @Test
    void submit_addToCartAnonymous_leavesUserIdNull() throws Exception {
        postEvents("10.2.0.9", """
                {"events":[{"eventType":"add_to_cart","productId":"wb-1"}]}
                """)
                .andExpect(status().isAccepted());

        SiteEvent saved = siteEventRepository.findAll().get(0);
        assertThat(saved.getUserId()).isNull();
    }

    @Test
    void submit_malformedProductId_returns400() throws Exception {
        String tooLong = "x".repeat(200);
        postEvents("10.2.0.10", """
                {"events":[{"eventType":"product_view","productId":"%s"}]}
                """.formatted(tooLong))
                .andExpect(status().isBadRequest());

        assertThat(siteEventRepository.findAll()).isEmpty();
    }
}
