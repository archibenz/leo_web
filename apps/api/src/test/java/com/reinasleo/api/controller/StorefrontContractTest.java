package com.reinasleo.api.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reinasleo.api.dto.storefront.StorefrontColour;
import com.reinasleo.api.dto.storefront.StorefrontProduct;
import com.reinasleo.api.dto.storefront.StorefrontResponse;
import com.reinasleo.api.dto.storefront.StorefrontSectionDto;
import com.reinasleo.api.dto.storefront.StorefrontSet;
import com.reinasleo.api.dto.storefront.StorefrontSetItem;
import com.reinasleo.api.service.StorefrontService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Имена полей — это и есть контракт с витриной: apps/web/lib/catalogue/types.ts
// читает ответ как есть, без маппинга, и переименованное поле не уронит ни один
// другой тест — страница просто отрисуется без цены или без артикула. Поэтому
// набор ключей на каждом уровне прибит списком, а не выборочными jsonPath.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class StorefrontContractTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockBean private StorefrontService storefrontService;

    // apps/web/lib/catalogue/types.ts — WhiteProduct
    private static final List<String> PRODUCT_KEYS = List.of(
            "id", "key", "slug", "en", "ru", "cat", "price", "sale",
            "descEn", "descRu", "storyEn", "storyRu",
            "compositionEn", "compositionRu", "careEn", "careRu",
            "colors", "sizes", "image", "gallery", "nm", "season", "featuredOrder", "lookbookOrder");

    // WhiteColor
    private static final List<String> COLOUR_KEYS = List.of(
            "id", "key", "hex", "en", "ru", "nm", "price", "sale", "image", "gallery");

    // WhiteSet
    private static final List<String> SET_KEYS = List.of("key", "en", "ru", "descEn", "descRu", "image", "items");

    // WhiteSetItem
    private static final List<String> SET_ITEM_KEYS = List.of("productId", "productKey", "colourKey");

    // StorefrontSection
    private static final List<String> SECTION_KEYS = List.of(
            "id", "slug", "layout", "status", "nameRu", "nameEn", "eyebrowRu", "eyebrowEn",
            "headlineRu", "headlineEn", "bodyRu", "bodyEn",
            "videoUrl", "videoDesktopUrl", "posterUrl", "posterDesktopUrl", "sortOrder");

    private static StorefrontResponse fullyPopulated() {
        StorefrontColour colour = new StorefrontColour("wb-1", "camel", "#b89a6e", "Camel", "Кэмел", 1L,
                new BigDecimal("25000"), new BigDecimal("12000"), "/i/c.jpg", List.of("/i/c-2.jpg"));
        StorefrontProduct product = new StorefrontProduct("m1", 2, "palto", "Coat", "Пальто", "outerwear",
                new BigDecimal("25000"), new BigDecimal("12000"), "d", "о", "story", "история",
                "w", "ш", "c", "у",
                List.of(colour), List.of("S", "M"), "/i/m.jpg", List.of("/i/m-2.jpg"), 1L, "aw26", 2, 3);
        StorefrontSet set = new StorefrontSet("everyday", "Everyday", "На каждый день", "d", "о", "/i/s.jpg",
                List.of(new StorefrontSetItem("wb-1", 2, "camel")));
        StorefrontSectionDto section = new StorefrontSectionDto("s1", "aw26-hero", "hero", "active",
                "Осень", "Autumn", "Осень", "Autumn", "Точный крой", "Precise tailoring", "текст", "body",
                "/v/a.mp4", "/v/b.mp4", "/i/a.jpg", "/i/b.jpg", 0);
        return new StorefrontResponse(List.of(product), List.of(set), List.of(section));
    }

    private static List<String> keysOf(JsonNode node) {
        List<String> names = new java.util.ArrayList<>();
        node.fieldNames().forEachRemaining(names::add);
        return names;
    }

    @Test
    void storefront_jsonCarriesExactlyTheFieldNamesTheStorefrontReads() throws Exception {
        when(storefrontService.getStorefront()).thenReturn(fullyPopulated());

        String body = mockMvc.perform(get("/api/catalog/storefront"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode root = objectMapper.readTree(body);

        assertThat(keysOf(root)).containsExactlyInAnyOrder("products", "sets", "sections");

        JsonNode product = root.get("products").get(0);
        assertThat(keysOf(product)).containsExactlyInAnyOrderElementsOf(PRODUCT_KEYS);
        assertThat(PRODUCT_KEYS).hasSize(24);

        JsonNode colour = product.get("colors").get(0);
        assertThat(keysOf(colour)).containsExactlyInAnyOrderElementsOf(COLOUR_KEYS);
        assertThat(COLOUR_KEYS).hasSize(10);

        JsonNode set = root.get("sets").get(0);
        assertThat(keysOf(set)).containsExactlyInAnyOrderElementsOf(SET_KEYS);
        assertThat(SET_KEYS).hasSize(7);

        JsonNode setItem = set.get("items").get(0);
        assertThat(keysOf(setItem)).containsExactlyInAnyOrderElementsOf(SET_ITEM_KEYS);
        assertThat(SET_ITEM_KEYS).hasSize(3);

        JsonNode section = root.get("sections").get(0);
        assertThat(keysOf(section)).containsExactlyInAnyOrderElementsOf(SECTION_KEYS);
        assertThat(SECTION_KEYS).hasSize(17);
    }
}
