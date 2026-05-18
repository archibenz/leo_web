package com.reinasleo.api.controller;

import com.reinasleo.api.model.Favorite;
import com.reinasleo.api.model.Order;
import com.reinasleo.api.model.OrderItem;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.CartRepository;
import com.reinasleo.api.repository.FavoriteRepository;
import com.reinasleo.api.repository.OrderRepository;
import com.reinasleo.api.repository.ProductRepository;
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

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Disabled;

// H2 (test profile) does not support Product.sizes TEXT[] column, so this
// integration test cannot persist a real Product. AuthServiceExportTest
// (Mockito) covers the aggregation logic; this class is preserved for the
// future Testcontainers/Postgres test pass.
@Disabled("requires Postgres testcontainers — H2 cannot create products(sizes TEXT[])")
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerExportTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private OrderRepository orderRepository;
    @Autowired private FavoriteRepository favoriteRepository;
    @Autowired private CartRepository cartRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;

    private User user;
    private String token;

    @BeforeEach
    void setUp() {
        orderRepository.deleteAll();
        favoriteRepository.deleteAll();
        cartRepository.deleteAll();
        userRepository.deleteAll();
        productRepository.deleteAll();
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

    @Test
    void export_withValidJwt_returns200AndContainsUserBlock() throws Exception {
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
                .andExpect(jsonPath("$.favorites").isArray());
    }

    @Test
    void export_responseExcludesPasswordHash() throws Exception {
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
    @Transactional
    void export_includesOrders_whenUserHasOrders() throws Exception {
        Product product = new Product();
        product.setId("p-test-1");
        product.setTitle("Test Dress");
        product.setPrice(new BigDecimal("9999.00"));
        product.setStockQuantity(10);
        productRepository.save(product);

        Order order = new Order(user, new BigDecimal("9999.00"));
        order.getItems().add(new OrderItem(order, product, "M", 1, new BigDecimal("9999.00")));
        orderRepository.save(order);

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
    @Transactional
    void export_includesFavorites_whenUserHasFavorites() throws Exception {
        Product product = new Product();
        product.setId("p-fav-1");
        product.setTitle("Fav Dress");
        product.setPrice(new BigDecimal("5555.00"));
        product.setStockQuantity(5);
        productRepository.save(product);

        favoriteRepository.save(new Favorite(user, product));

        mockMvc.perform(get("/api/auth/me/export")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.favorites.length()").value(1))
                .andExpect(jsonPath("$.favorites[0].productId").value("p-fav-1"))
                .andExpect(jsonPath("$.favorites[0].productTitle").value("Fav Dress"));
    }

    @Test
    void export_emptyAccount_returns200WithEmptyCollections() throws Exception {
        mockMvc.perform(get("/api/auth/me/export")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orders").isEmpty())
                .andExpect(jsonPath("$.favorites").isEmpty())
                .andExpect(jsonPath("$.cart.items").isEmpty())
                .andExpect(jsonPath("$.verificationCodesIssued").value(0));
    }
}
