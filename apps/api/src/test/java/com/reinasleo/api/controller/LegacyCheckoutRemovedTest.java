package com.reinasleo.api.controller;

import com.reinasleo.api.model.MarketplacePrice;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.MarketplacePriceRepository;
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
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * lw-8i33 (решение оркестратора 25.09): у цены покупателя один источник —
 * VariantPriceCalculator, как на витрине и в кассе.
 *
 * 1. Старое оформление из корзины POST /api/me/orders/checkout УДАЛЕНО: оно
 *    создавало заказ по сырому products.price, и такой заказ уехал бы в
 *    site_order с неверной суммой. Проверяется под настоящим входом —
 *    иначе «нет ручки» нельзя отличить от «не пустили».
 * 2. Корзина /api/me/cart показывает цену витрины: скидку, цену площадки, а
 *    вариант без цены вовсе не принимает.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class LegacyCheckoutRemovedTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository users;
    @Autowired private ProductRepository products;
    @Autowired private MarketplacePriceRepository marketplacePrices;
    @Autowired private JwtService jwtService;
    @Autowired private PasswordEncoder passwordEncoder;

    private String token;

    @BeforeEach
    void setUp() {
        User user = new User("legacy-checkout@test.dev", "Имя", "Фамилия", passwordEncoder.encode("Sup3rSecret!"),
                LocalDate.of(1990, 1, 1), false, true);
        user = users.save(user);
        token = jwtService.generateToken(user.getId(), user.getEmail());
    }

    private Product product(String id, String rawPrice, String source, int discountPct) {
        Product p = new Product();
        p.setId(id);
        p.setTitle(id);
        p.setPrice(rawPrice == null ? null : new BigDecimal(rawPrice));
        p.setPriceSource(source);
        p.setDiscountPct(discountPct);
        p.setImage("/images/white/products/a.jpg");
        p.setCategory("tailoring");
        p.setSizes(new String[]{"S", "M"});
        p.setImages("[]");
        p.setStockQuantity(10);
        p.setActive(true);
        return products.save(p);
    }

    private ResultActions addToCart(String productId) throws Exception {
        return mockMvc.perform(post("/api/me/cart")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"productId\":\"" + productId + "\",\"size\":\"M\",\"quantity\":2}"));
    }

    @Test
    void theLegacyCheckoutIsGoneButTheOrderHistoryStays() throws Exception {
        // Вход настоящий: история заказов под тем же токеном отвечает 200.
        mockMvc.perform(get("/api/me/orders").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        int code = mockMvc.perform(post("/api/me/orders/checkout").header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getStatus();
        assertThat(code).as("POST /api/me/orders/checkout").isIn(404, 405);
    }

    // Неизвестный адрес и не тот метод — 404/405, а не 500 из общего
    // обработчика (до 25.09 так отвечал любой неизвестный путь под /api).
    @Test
    void anUnknownRouteIsA404AndAWrongMethodA405NotA500() throws Exception {
        mockMvc.perform(get("/api/me/definitely-not-a-route").header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/me/orders").header("Authorization", "Bearer " + token))
                .andExpect(status().isMethodNotAllowed());
    }

    // Скидка 20% от 4999.99 → 3999.99 (вниз до копейки), как на витрине.
    @Test
    void theCartShowsTheDiscountedPrice() throws Exception {
        product("lc-discount", "4999.99", "manual", 20);

        addToCart("lc-discount")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].productPrice").value(3999.99))
                .andExpect(jsonPath("$.totalPrice").value(7999.98));
    }

    // Переключатель на площадку: цена её покупателя, а не устаревшая ручная.
    @Test
    void theCartShowsTheMarketplacePrice() throws Exception {
        product("lc-market", "5000.00", "wildberries", 0);
        MarketplacePrice row = new MarketplacePrice();
        row.setProductId("lc-market");
        row.setSource("wildberries");
        row.setBuyerPriceKop(4_100_00L);
        row.setReceivedAt(Instant.now());
        marketplacePrices.save(row);

        addToCart("lc-market")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].productPrice").value(4100.00));
    }

    @Test
    void aVariantWithoutAnyPriceIsNotForSale() throws Exception {
        product("lc-preorder", null, "manual", 0);

        addToCart("lc-preorder").andExpect(status().isBadRequest());
    }
}
