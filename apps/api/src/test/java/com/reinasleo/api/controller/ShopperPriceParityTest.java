package com.reinasleo.api.controller;

import com.jayway.jsonpath.JsonPath;
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
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Одна цена покупателя на всех экранах (25.09, вслед за lw-95wh/lw-8i33):
 * корзина, избранное и выгрузка данных пользователя показывают то же, что
 * витрина, — через ShopperPrices. Покупатель, увидевший в выгрузке другую
 * цену, чем в корзине, решил бы, что его обсчитали.
 *
 * Проверка — тождество трёх ответов между собой и с ожидаемой ценой витрины,
 * а не содержимое одного: одно место, отставшее от остальных, краснеет.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ShopperPriceParityTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository users;
    @Autowired private ProductRepository products;
    @Autowired private MarketplacePriceRepository marketplacePrices;
    @Autowired private JwtService jwtService;
    @Autowired private PasswordEncoder passwordEncoder;

    private String token;

    @BeforeEach
    void setUp() {
        User user = users.save(new User("parity@test.dev", "Имя", "Фамилия", passwordEncoder.encode("Sup3rSecret!"),
                LocalDate.of(1990, 1, 1), false, true));
        token = jwtService.generateToken(user.getId(), user.getEmail());
    }

    private void product(String id, String rawPrice, String source, int discountPct) {
        Product p = new Product();
        p.setId(id);
        p.setTitle(id);
        p.setPrice(new BigDecimal(rawPrice));
        p.setPriceSource(source);
        p.setDiscountPct(discountPct);
        p.setImage("/images/white/products/a.jpg");
        p.setCategory("tailoring");
        p.setSizes(new String[]{"S", "M"});
        p.setImages("[]");
        p.setStockQuantity(10);
        p.setActive(true);
        products.save(p);
    }

    private String body(String method, String path, String json) throws Exception {
        var request = "POST".equals(method) ? post(path) : get(path);
        request.header("Authorization", "Bearer " + token);
        if (json != null) request.contentType(MediaType.APPLICATION_JSON).content(json);
        return mockMvc.perform(request).andExpect(status().is2xxSuccessful())
                .andReturn().getResponse().getContentAsString();
    }

    private void assertSamePriceEverywhere(String productId, String expected) throws Exception {
        body("POST", "/api/me/cart", "{\"productId\":\"" + productId + "\",\"size\":\"M\",\"quantity\":1}");
        body("POST", "/api/me/favorites/" + productId, null);

        BigDecimal cart = price(body("GET", "/api/me/cart", null), "$.items[0].productPrice");
        BigDecimal favorite = price(body("GET", "/api/me/favorites", null), "$[0].productPrice");
        String export = body("GET", "/api/auth/me/export", null);
        BigDecimal exportCart = price(export, "$.cart.items[0].productPrice");
        BigDecimal exportFavorite = price(export, "$.favorites[0].productPrice");

        assertThat(cart).as("корзина").isEqualByComparingTo(expected);
        assertThat(favorite).as("избранное").isEqualByComparingTo(expected);
        assertThat(exportCart).as("выгрузка: корзина").isEqualByComparingTo(expected);
        assertThat(exportFavorite).as("выгрузка: избранное").isEqualByComparingTo(expected);
    }

    private static BigDecimal price(String json, String path) {
        Object v = JsonPath.read(json, path);
        return new BigDecimal(String.valueOf(v));
    }

    // Скидка 20% от 4999.99 → 3999.99; сырое products.price — 4999.99.
    @Test
    void aDiscountedVariantShowsOnePriceOnEveryScreen() throws Exception {
        product("pp-discount", "4999.99", "manual", 20);
        assertSamePriceEverywhere("pp-discount", "3999.99");
    }

    // Цена площадки 4100 при устаревшей ручной 5000.
    @Test
    void aMarketplaceSourcedVariantShowsOnePriceOnEveryScreen() throws Exception {
        product("pp-market", "5000.00", "wildberries", 0);
        MarketplacePrice row = new MarketplacePrice();
        row.setProductId("pp-market");
        row.setSource("wildberries");
        row.setBuyerPriceKop(4_100_00L);
        row.setReceivedAt(Instant.now());
        marketplacePrices.save(row);
        assertSamePriceEverywhere("pp-market", "4100.00");
    }
}
