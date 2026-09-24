package com.reinasleo.api.controller;

import com.reinasleo.api.dto.storefront.StorefrontColour;
import com.reinasleo.api.dto.storefront.StorefrontProduct;
import com.reinasleo.api.dto.storefront.StorefrontResponse;
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

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class StorefrontControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private StorefrontService storefrontService;

    @Test
    void storefront_isPublicAndSerialisesWhiteProductShape() throws Exception {
        StorefrontColour c = new StorefrontColour("wb-1", "camel", "#b89a6e", "Camel", "Кэмел", 1L,
                new BigDecimal("25000"), null, "/i/c.jpg", List.of());
        StorefrontProduct p = new StorefrontProduct("m1", 2, "palto", "Coat", "Пальто", "outerwear",
                new BigDecimal("25000"), null, "d", "о", null, null, "w", "ш", "c", "у",
                List.of(c), List.of("S", "M"), "/i/m.jpg", List.of(), 1L, "aw26", 2, null, null);
        when(storefrontService.getStorefront()).thenReturn(new StorefrontResponse(List.of(p), List.of(), List.of()));

        mockMvc.perform(get("/api/catalog/storefront"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.products[0].key").value(2))
                .andExpect(jsonPath("$.products[0].colors[0].id").value("wb-1"))
                .andExpect(jsonPath("$.products[0].colors[0].price").value(25000))
                .andExpect(jsonPath("$.products[0].colors[0].sale").doesNotExist())
                .andExpect(jsonPath("$.products[0].storyEn").doesNotExist())
                .andExpect(jsonPath("$.sets").isArray())
                .andExpect(jsonPath("$.sections").isArray());
    }
}
