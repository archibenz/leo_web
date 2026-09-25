package com.reinasleo.api.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * lw-zbst (решение оркестратора 25.09): старый публичный каталог удалён. Все
 * его ручки отдавали сырое products.price мимо VariantPriceCalculator, а
 * звал их только архив старой темы. Одна правда о цене — /api/catalog/storefront.
 *
 * Живая ручка проверяется рядом: иначе 404 на всём /api/catalog/** выглядел бы
 * так же, как «удалили лишнее».
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LegacyCatalogRemovedTest {

    @Autowired private MockMvc mockMvc;

    @Test
    void theOldCatalogIsGone() throws Exception {
        for (String path : List.of(
                "/api/catalog/products",
                "/api/catalog/products/some-id",
                "/api/catalog/products/some-id/recommendations",
                "/api/catalog/collections",
                "/api/catalog/collections/some-slug",
                "/api/catalog/homepage")) {
            mockMvc.perform(get(path)).andExpect(status().isNotFound());
        }
    }

    @Test
    void theStorefrontCatalogStays() throws Exception {
        mockMvc.perform(get("/api/catalog/storefront")).andExpect(status().isOk());
    }
}
