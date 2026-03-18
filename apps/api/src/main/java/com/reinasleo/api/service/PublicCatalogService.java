package com.reinasleo.api.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reinasleo.api.dto.CollectionResponse;
import com.reinasleo.api.dto.HomepageResponse;
import com.reinasleo.api.dto.PublicProductDetailResponse;
import com.reinasleo.api.dto.PublicProductResponse;
import com.reinasleo.api.model.Collection;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.SiteConfig;
import com.reinasleo.api.repository.CollectionRepository;
import com.reinasleo.api.repository.ProductRepository;
import com.reinasleo.api.repository.SiteConfigRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PublicCatalogService {

    private final ProductRepository productRepository;
    private final CollectionRepository collectionRepository;
    private final SiteConfigRepository siteConfigRepository;
    private final RecommendationService recommendationService;
    private final ObjectMapper objectMapper;

    public PublicCatalogService(ProductRepository productRepository,
                                CollectionRepository collectionRepository,
                                SiteConfigRepository siteConfigRepository,
                                RecommendationService recommendationService,
                                ObjectMapper objectMapper) {
        this.productRepository = productRepository;
        this.collectionRepository = collectionRepository;
        this.siteConfigRepository = siteConfigRepository;
        this.recommendationService = recommendationService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<PublicProductResponse> listActiveProducts() {
        return productRepository.findByActiveTrueOrderByCreatedAtDesc().stream()
                .map(this::toPublicResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PublicProductDetailResponse getProductDetail(String id) {
        Product p = productRepository.findById(id)
                .filter(Product::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        return toDetailResponse(p);
    }

    @Transactional(readOnly = true)
    public List<CollectionResponse> listActiveCollections() {
        return collectionRepository.findByActiveTrueOrderBySortOrderAsc().stream()
                .map(c -> {
                    long count = productRepository.findByCollectionIdAndActiveTrueOrderByCreatedAtDesc(c.getId()).size();
                    return new CollectionResponse(
                            c.getId(), c.getName(), c.getSlug(), c.getDescription(),
                            c.getImageUrl(), c.isActive(), c.getSortOrder(),
                            count, c.getCreatedAt()
                    );
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PublicProductResponse> getCollectionProducts(String slug) {
        Collection c = collectionRepository.findBySlug(slug)
                .filter(Collection::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Collection not found"));
        return productRepository.findByCollectionIdAndActiveTrueOrderByCreatedAtDesc(c.getId()).stream()
                .map(this::toPublicResponse)
                .toList();
    }

    private PublicProductResponse toPublicResponse(Product p) {
        String collectionName = null;
        if (p.getCollectionId() != null) {
            collectionName = collectionRepository.findById(p.getCollectionId())
                    .map(Collection::getName).orElse(null);
        }
        return new PublicProductResponse(
                p.getId(), p.getTitle(), p.getSubtitle(), p.getPrice(),
                p.getImage(), p.getCategory(), p.getSizes(),
                p.isTest(), p.getOccasion(), p.getColor(), p.getMaterial(),
                p.getImages(), p.getCollectionId(), collectionName,
                p.getStockQuantity() > 0 || p.isTest()
        );
    }

    @Transactional(readOnly = true)
    public List<PublicProductResponse> getProductRecommendations(String productId) {
        return recommendationService.getRecommendations(productId).stream()
                .map(this::toPublicResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public HomepageResponse getHomepage() {
        // Featured products from site_config
        List<PublicProductResponse> featuredProducts = siteConfigRepository.findById("homepage_featured")
                .map(config -> {
                    try {
                        Map<String, Object> val = objectMapper.readValue(config.getValue(),
                                new TypeReference<Map<String, Object>>() {});
                        @SuppressWarnings("unchecked")
                        List<String> productIds = (List<String>) val.get("productIds");
                        if (productIds == null || productIds.isEmpty()) {
                            return List.<PublicProductResponse>of();
                        }
                        return productIds.stream()
                                .map(id -> productRepository.findById(id).orElse(null))
                                .filter(p -> p != null && p.isActive())
                                .map(this::toPublicResponse)
                                .toList();
                    } catch (Exception e) {
                        return List.<PublicProductResponse>of();
                    }
                })
                .orElse(List.of());

        // Collections from site_config
        List<CollectionResponse> collections = siteConfigRepository.findById("homepage_collections")
                .map(config -> {
                    try {
                        Map<String, Object> val = objectMapper.readValue(config.getValue(),
                                new TypeReference<Map<String, Object>>() {});
                        @SuppressWarnings("unchecked")
                        List<String> collectionIds = (List<String>) val.get("collectionIds");
                        if (collectionIds == null || collectionIds.isEmpty()) {
                            return listActiveCollections();
                        }
                        return collectionIds.stream()
                                .map(id -> collectionRepository.findById(UUID.fromString(id)).orElse(null))
                                .filter(c -> c != null && c.isActive())
                                .map(c -> {
                                    long count = productRepository
                                            .findByCollectionIdAndActiveTrueOrderByCreatedAtDesc(c.getId()).size();
                                    return new CollectionResponse(
                                            c.getId(), c.getName(), c.getSlug(), c.getDescription(),
                                            c.getImageUrl(), c.isActive(), c.getSortOrder(),
                                            count, c.getCreatedAt()
                                    );
                                })
                                .toList();
                    } catch (Exception e) {
                        return listActiveCollections();
                    }
                })
                .orElse(listActiveCollections());

        // Season from site_config
        Map<String, Object> season = siteConfigRepository.findById("current_season")
                .map(config -> {
                    try {
                        return objectMapper.readValue(config.getValue(),
                                new TypeReference<Map<String, Object>>() {});
                    } catch (Exception e) {
                        return Map.<String, Object>of();
                    }
                })
                .orElse(Map.of());

        return new HomepageResponse(featuredProducts, collections, season);
    }

    private PublicProductDetailResponse toDetailResponse(Product p) {
        String collectionName = null;
        if (p.getCollectionId() != null) {
            collectionName = collectionRepository.findById(p.getCollectionId())
                    .map(Collection::getName).orElse(null);
        }
        return new PublicProductDetailResponse(
                p.getId(), p.getTitle(), p.getSubtitle(), p.getDescription(),
                p.getPrice(), p.getImage(), p.getCategory(), p.getSizes(),
                p.isTest(), p.getOccasion(), p.getColor(), p.getMaterial(),
                p.getSku(), p.getImages(), p.getCollectionId(), collectionName,
                p.getStockQuantity() > 0 || p.isTest()
        );
    }
}
