package com.reinasleo.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reinasleo.api.dto.PublicProductDetailResponse;
import com.reinasleo.api.dto.PublicProductResponse;
import com.reinasleo.api.model.Collection;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.repository.CollectionRepository;
import com.reinasleo.api.repository.ProductRepository;
import com.reinasleo.api.repository.SiteConfigRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublicCatalogServiceTest {

    @Mock private ProductRepository productRepository;
    @Mock private CollectionRepository collectionRepository;
    @Mock private SiteConfigRepository siteConfigRepository;
    @Mock private RecommendationService recommendationService;

    private PublicCatalogService catalogService;

    @BeforeEach
    void setUp() {
        catalogService = new PublicCatalogService(
                productRepository, collectionRepository, siteConfigRepository,
                recommendationService, new ObjectMapper()
        );
    }

    private Product createProduct(String id, String title, BigDecimal price, boolean active, int stock) {
        Product p = new Product();
        p.setId(id);
        p.setTitle(title);
        p.setPrice(price);
        p.setActive(active);
        p.setStockQuantity(stock);
        p.setImages("[]");
        return p;
    }

    @Test
    void listActiveProducts_returnsMappedResponses() {
        Product p1 = createProduct("p1", "Dress A", new BigDecimal("100.00"), true, 5);
        Product p2 = createProduct("p2", "Dress B", new BigDecimal("200.00"), true, 0);

        when(productRepository.findByActiveTrueOrderByCreatedAtDesc()).thenReturn(List.of(p1, p2));
        when(collectionRepository.findAll()).thenReturn(List.of());

        List<PublicProductResponse> result = catalogService.listActiveProducts();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).id()).isEqualTo("p1");
        assertThat(result.get(0).title()).isEqualTo("Dress A");
        assertThat(result.get(0).inStock()).isTrue();
        assertThat(result.get(1).inStock()).isFalse();
    }

    @Test
    void listActiveProducts_mapsCollectionName() {
        UUID collectionId = UUID.randomUUID();
        Product p = createProduct("p1", "Dress", new BigDecimal("100.00"), true, 1);
        p.setCollectionId(collectionId);

        Collection collection = new Collection();
        try {
            var idField = Collection.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(collection, collectionId);
            var nameField = Collection.class.getDeclaredField("name");
            nameField.setAccessible(true);
            nameField.set(collection, "Summer 2025");
        } catch (Exception ignored) {}

        when(productRepository.findByActiveTrueOrderByCreatedAtDesc()).thenReturn(List.of(p));
        when(collectionRepository.findAll()).thenReturn(List.of(collection));

        List<PublicProductResponse> result = catalogService.listActiveProducts();

        assertThat(result.get(0).collectionName()).isEqualTo("Summer 2025");
    }

    @Test
    void getProductDetail_withValidId_returnsDetail() {
        Product p = createProduct("p1", "Dress A", new BigDecimal("150.00"), true, 3);
        p.setDescription("A beautiful dress");
        p.setSku("SKU-001");

        when(productRepository.findById("p1")).thenReturn(Optional.of(p));

        PublicProductDetailResponse detail = catalogService.getProductDetail("p1");

        assertThat(detail.id()).isEqualTo("p1");
        assertThat(detail.title()).isEqualTo("Dress A");
        assertThat(detail.description()).isEqualTo("A beautiful dress");
        assertThat(detail.sku()).isEqualTo("SKU-001");
        assertThat(detail.inStock()).isTrue();
    }

    @Test
    void getProductDetail_withInactiveProduct_throws404() {
        Product p = createProduct("p1", "Dress A", new BigDecimal("150.00"), false, 3);
        when(productRepository.findById("p1")).thenReturn(Optional.of(p));

        assertThatThrownBy(() -> catalogService.getProductDetail("p1"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Product not found");
    }

    @Test
    void getProductDetail_withNonExistentId_throws404() {
        when(productRepository.findById("nonexistent")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> catalogService.getProductDetail("nonexistent"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Product not found");
    }

    @Test
    void getProductDetail_testProduct_showsInStock() {
        Product p = createProduct("p1", "Test Dress", new BigDecimal("100.00"), true, 0);
        p.setTest(true);
        when(productRepository.findById("p1")).thenReturn(Optional.of(p));

        PublicProductDetailResponse detail = catalogService.getProductDetail("p1");

        assertThat(detail.inStock()).isTrue();
    }
}
