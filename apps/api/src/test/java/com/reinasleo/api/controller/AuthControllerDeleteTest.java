package com.reinasleo.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.UserRepository;
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
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerDeleteTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;

    private User user;
    private String token;
    private static final String RAW_PASSWORD = "Sup3rSecret!";

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        String hash = passwordEncoder.encode(RAW_PASSWORD);
        user = new User(
                "alice-delete@example.com",
                "Alice",
                "Smith",
                hash,
                LocalDate.of(1990, 1, 1),
                false,
                true
        );
        user = userRepository.save(user);
        token = jwtService.generateToken(user.getId(), user.getEmail());
    }

    private String body(String credential, String confirmation) throws Exception {
        Map<String, Object> map = new java.util.HashMap<>();
        if (credential != null) map.put("credential", credential);
        if (confirmation != null) map.put("confirmation", confirmation);
        return objectMapper.writeValueAsString(map);
    }

    @Test
    @Transactional
    void delete_withCorrectPasswordAndConfirmation_returns204AndSoftDeletes() throws Exception {
        mockMvc.perform(delete("/api/auth/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(RAW_PASSWORD, "DELETE")))
                .andExpect(status().isNoContent());

        User reloaded = userRepository.findById(user.getId()).orElseThrow();
        assertThat(reloaded.getDeletedAt()).isNotNull();
        assertThat(reloaded.getEmail()).isEqualTo("deleted-" + user.getId() + "@deleted.local");
        assertThat(reloaded.getName()).isEqualTo("deleted");
        assertThat(reloaded.getPasswordHash()).isNull();
    }

    @Test
    void delete_withWrongPassword_returns401() throws Exception {
        mockMvc.perform(delete("/api/auth/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("nope-not-the-password", "DELETE")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("invalid_credentials"));

        User reloaded = userRepository.findById(user.getId()).orElseThrow();
        assertThat(reloaded.getDeletedAt()).isNull();
        assertThat(reloaded.getEmail()).isEqualTo("alice-delete@example.com");
    }

    @Test
    void delete_withWrongConfirmation_returns400() throws Exception {
        mockMvc.perform(delete("/api/auth/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(RAW_PASSWORD, "delete")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("confirmation_mismatch"));

        User reloaded = userRepository.findById(user.getId()).orElseThrow();
        assertThat(reloaded.getDeletedAt()).isNull();
    }

    @Test
    void delete_withoutAuth_returns401OrForbidden() throws Exception {
        mockMvc.perform(delete("/api/auth/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(RAW_PASSWORD, "DELETE")))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).isIn(401, 403);
                });
    }

    @Test
    @Transactional
    void delete_afterSoftDelete_jwtRejected() throws Exception {
        mockMvc.perform(delete("/api/auth/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(RAW_PASSWORD, "DELETE")))
                .andExpect(status().isNoContent());

        // Same token, same /me — but principal is now skipped by JwtAuthFilter.
        mockMvc.perform(delete("/api/auth/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(RAW_PASSWORD, "DELETE")))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).isIn(401, 403);
                });
    }
}
