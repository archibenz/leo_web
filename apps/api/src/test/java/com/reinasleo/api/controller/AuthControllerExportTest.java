package com.reinasleo.api.controller;

import com.reinasleo.api.dto.AccountExportResponse;
import com.reinasleo.api.dto.CartExportDto;
import com.reinasleo.api.dto.FavoriteExportDto;
import com.reinasleo.api.dto.OrderExportDto;
import com.reinasleo.api.dto.OrderItemExportDto;
import com.reinasleo.api.dto.ProductInterestEventExportDto;
import com.reinasleo.api.dto.UserExportDto;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.UserRepository;
import com.reinasleo.api.security.JwtService;
import com.reinasleo.api.service.AuthService;
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

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// AuthService mocked so JPA persistence (Product.sizes TEXT[] unsupported on H2)
// is bypassed; tests cover the HTTP layer only.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerExportTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;
    @MockBean private AuthService authService;

    private User user;
    private String token;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        String hash = passwordEncoder.encode("Sup3rSecret!");
        user = new User(
                "alice-export@example.com",
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

    private UserExportDto userExportDto(User u, boolean hasPassword, boolean hasTelegram) {
        return new UserExportDto(
                u.getId(),
                u.getEmail(),
                u.getName(),
                u.getSurname(),
                u.getPhone(),
                u.getDateOfBirth(),
                u.getTelegramId(),
                u.isNewsletter(),
                u.isNewsletterPromos(),
                u.isNewsletterCollections(),
                u.isNewsletterProjects(),
                u.isPrivacyAccepted(),
                u.getRole(),
                u.getCreatedAt(),
                u.getUpdatedAt(),
                hasPassword,
                hasTelegram
        );
    }

    private AccountExportResponse emptyExport() {
        return new AccountExportResponse(
                userExportDto(user, true, false),
                List.of(),
                new CartExportDto(List.of(), null, null),
                List.of(),
                List.of(),
                0L,
                Instant.now()
        );
    }

    @Test
    void export_withValidJwt_returns200AndContainsUserBlock() throws Exception {
        when(authService.exportAccountData(any(User.class))).thenReturn(emptyExport());

        mockMvc.perform(get("/api/auth/me/export")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.user.email").value("alice-export@example.com"))
                .andExpect(jsonPath("$.user.name").value("Alice"))
                .andExpect(jsonPath("$.user.surname").value("Smith"))
                .andExpect(jsonPath("$.user.hasPassword").value(true))
                .andExpect(jsonPath("$.user.hasTelegram").value(false))
                .andExpect(jsonPath("$.exportedAt").exists())
                .andExpect(jsonPath("$.orders").isArray())
                .andExpect(jsonPath("$.cart").exists())
                .andExpect(jsonPath("$.favorites").isArray())
                .andExpect(jsonPath("$.productInterestEvents").isArray());
    }

    @Test
    void export_responseExcludesPasswordHash() throws Exception {
        when(authService.exportAccountData(any(User.class))).thenReturn(emptyExport());

        mockMvc.perform(get("/api/auth/me/export")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.user.password").doesNotExist());
    }

    @Test
    void export_withoutAuth_returns401OrForbidden() throws Exception {
        mockMvc.perform(get("/api/auth/me/export"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    org.assertj.core.api.Assertions.assertThat(status).isIn(401, 403);
                });
    }

    @Test
    void export_includesOrders_whenUserHasOrders() throws Exception {
        OrderItemExportDto orderItem = new OrderItemExportDto(
                "p-test-1", "Test Dress", "M", 1, new BigDecimal("9999.00"));
        OrderExportDto order = new OrderExportDto(
                UUID.randomUUID(), "pending", new BigDecimal("9999.00"),
                List.of(orderItem), Instant.now(), Instant.now());
        AccountExportResponse response = new AccountExportResponse(
                userExportDto(user, true, false),
                List.of(order),
                new CartExportDto(List.of(), null, null),
                List.of(),
                List.of(),
                0L,
                Instant.now());
        when(authService.exportAccountData(any(User.class))).thenReturn(response);

        mockMvc.perform(get("/api/auth/me/export")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orders.length()").value(1))
                .andExpect(jsonPath("$.orders[0].items.length()").value(1))
                .andExpect(jsonPath("$.orders[0].items[0].productId").value("p-test-1"))
                .andExpect(jsonPath("$.orders[0].items[0].productTitle").value("Test Dress"))
                .andExpect(jsonPath("$.orders[0].items[0].size").value("M"))
                .andExpect(jsonPath("$.orders[0].items[0].quantity").value(1));
    }

    @Test
    void export_includesFavorites_whenUserHasFavorites() throws Exception {
        FavoriteExportDto fav = new FavoriteExportDto(
                "p-fav-1", "Fav Dress", new BigDecimal("5555.00"), Instant.now());
        AccountExportResponse response = new AccountExportResponse(
                userExportDto(user, true, false),
                List.of(),
                new CartExportDto(List.of(), null, null),
                List.of(fav),
                List.of(),
                0L,
                Instant.now());
        when(authService.exportAccountData(any(User.class))).thenReturn(response);

        mockMvc.perform(get("/api/auth/me/export")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.favorites.length()").value(1))
                .andExpect(jsonPath("$.favorites[0].productId").value("p-fav-1"))
                .andExpect(jsonPath("$.favorites[0].productTitle").value("Fav Dress"));
    }

    @Test
    void export_emptyAccount_returns200WithEmptyCollections() throws Exception {
        when(authService.exportAccountData(any(User.class))).thenReturn(emptyExport());

        mockMvc.perform(get("/api/auth/me/export")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orders").isEmpty())
                .andExpect(jsonPath("$.favorites").isEmpty())
                .andExpect(jsonPath("$.cart.items").isEmpty())
                .andExpect(jsonPath("$.productInterestEvents").isEmpty())
                .andExpect(jsonPath("$.verificationCodesIssued").value(0));
    }

    @Test
    void export_includesProductInterestEvents_whenUserHasEvents() throws Exception {
        ProductInterestEventExportDto event = new ProductInterestEventExportDto(
                "p-evt-1", "Tracked Dress", "add_to_cart", Instant.now());
        AccountExportResponse response = new AccountExportResponse(
                userExportDto(user, true, false),
                List.of(),
                new CartExportDto(List.of(), null, null),
                List.of(),
                List.of(event),
                0L,
                Instant.now());
        when(authService.exportAccountData(any(User.class))).thenReturn(response);

        mockMvc.perform(get("/api/auth/me/export")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productInterestEvents.length()").value(1))
                .andExpect(jsonPath("$.productInterestEvents[0].productId").value("p-evt-1"))
                .andExpect(jsonPath("$.productInterestEvents[0].productTitle").value("Tracked Dress"))
                .andExpect(jsonPath("$.productInterestEvents[0].eventType").value("add_to_cart"));
    }
}
