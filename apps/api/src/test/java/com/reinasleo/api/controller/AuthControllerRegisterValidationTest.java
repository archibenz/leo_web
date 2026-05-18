package com.reinasleo.api.controller;

import com.reinasleo.api.service.AuthService;
import com.reinasleo.api.service.VerificationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerRegisterValidationTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private AuthService authService;
    @MockBean private VerificationService verificationService;

    @Test
    void register_withWeakPassword_returns400AndPasswordFieldError() throws Exception {
        String body = """
                {
                  "email": "user@example.com",
                  "code": "123456",
                  "firstName": "Anna",
                  "surname": "Ivanova",
                  "password": "abcdefgh",
                  "newsletter": false,
                  "newsletterPromos": false,
                  "newsletterCollections": false,
                  "newsletterProjects": false,
                  "privacyAccepted": true
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field=='password')].message")
                        .value(org.hamcrest.Matchers.hasItem("password_weak")));

        // AuthService.register must NOT be invoked on validation failure;
        // request stops at the controller boundary thanks to @Valid.
        verifyNoInteractions(authService);
    }

    @Test
    void register_withCyrillicOnlyPassword_returns400() throws Exception {
        String body = """
                {
                  "email": "user@example.com",
                  "code": "123456",
                  "firstName": "Anna",
                  "surname": "Ivanova",
                  "password": "короткий1",
                  "newsletter": false,
                  "newsletterPromos": false,
                  "newsletterCollections": false,
                  "newsletterProjects": false,
                  "privacyAccepted": true
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field=='password')].message")
                        .value(org.hamcrest.Matchers.hasItem("password_weak")));
    }
}
