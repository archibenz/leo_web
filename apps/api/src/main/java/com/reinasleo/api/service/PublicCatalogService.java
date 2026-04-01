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
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

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

    @Cacheable("products")
    @Transactional(readOnly = true)
    public List<PublicProductResponse> listActiveProducts() {
        Map<UUID, String> collectionNames = loadCollectionNames();
        return productRepository.findByActiveTrueOrderByCreatedAtDesc().stream()
                .map(p -> toPublicResponse(p, collectionNames))
                .toList();
    }

    @Transactional(readOnly = true)
    public PublicProductDetailResponse getProductDetail(String id) {
        Product p = productRepository.findById(id)
                .filter(Product::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        return toDetailResponse(p);
    }

    @Cacheable("collections")
    @Transactional(readOnly = true)
    public List<CollectionResponse> listActiveCollections() {
        Map<UUID, Long> countsByCollection = loadCollectionCounts();
        return collectionRepository.findByActiveTrueOrderBySortOrderAsc().stream()
                .map(c -> new CollectionResponse(
                        c.getId(), c.getName(), c.getSlug(), c.getDescription(),
                        c.getImageUrl(), c.isActive(), c.getSortOrder(),
                        countsByCollection.getOrDefault(c.getId(), 0L), c.getCreatedAt()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PublicProductResponse> getCollectionProducts(String slug) {
        Collection c = collectionRepository.findBySlug(slug)
                .filter(Collection::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Collection not found"));
        Map<UUID, String> collectionNames = loadCollectionNames();
        return productRepository.findByCollectionIdAndActiveTrueOrderByCreatedAtDesc(c.getId()).stream()
                .map(p -> toPublicResponse(p, collectionNames))
                .toList();
    }

    private PublicProductResponse toPublicResponse(Product p, Map<UUID, String> collectionNames) {
        String collectionName = p.getCollectionId() != null
                ? collectionNames.get(p.getCollectionId())
                : null;
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
        Map<UUID, String> collectionNames = loadCollectionNames();
        return recommendationService.getRecommendations(productId).stream()
                .map(p -> toPublicResponse(p, collectionNames))
                .toList();
    }

    @Cacheable("homepage")
    @Transactional(readOnly = true)
    public HomepageResponse getHomepage() {
        Map<UUID, String> collectionNames = loadCollectionNames();
        Map<UUID, Long> countsByCollection = loadCollectionCounts();

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
                        List<Product> products = productRepository.findByIdInAndActiveTrue(productIds);
                        Map<String, Product> productMap = products.stream()
                                .collect(Collectors.toMap(Product::getId, p -> p));
                        return productIds.stream()
                                .map(productMap::get)
                                .filter(p -> p != null)
                                .map(p -> toPublicResponse(p, collectionNames))
                                .toList();
                    } catch (Exception e) {
                        return List.<PublicProductResponse>of();
                    }
                })
                .orElse(List.of());

        List<CollectionResponse> collections = siteConfigRepository.findById("homepage_collections")
                .map(config -> {
                    try {
                        Map<String, Object> val = objectMapper.readValue(config.getValue(),
                                new TypeReference<Map<String, Object>>() {});
                        @SuppressWarnings("unchecked")
                        List<String> collectionIds = (List<String>) val.get("collectionIds");
                        if (collectionIds == null || collectionIds.isEmpty()) {
                            return buildCollectionResponses(countsByCollection);
                        }
                        return collectionIds.stream()
                                .map(id -> collectionRepository.findById(UUID.fromString(id)).orElse(null))
                                .filter(c -> c != null && c.isActive())
                                .map(c -> new CollectionResponse(
                                        c.getId(), c.getName(), c.getSlug(), c.getDescription(),
                                        c.getImageUrl(), c.isActive(), c.getSortOrder(),
                                        countsByCollection.getOrDefault(c.getId(), 0L), c.getCreatedAt()
                                ))
                                .toList();
                    } catch (Exception e) {
                        return buildCollectionResponses(countsByCollection);
                    }
                })
                .orElse(buildCollectionResponses(countsByCollection));

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

    private List<CollectionResponse> buildCollectionResponses(Map<UUID, Long> countsByCollection) {
        return collectionRepository.findByActiveTrueOrderBySortOrderAsc().stream()
                .map(c -> new CollectionResponse(
                        c.getId(), c.getName(), c.getSlug(), c.getDescription(),
                        c.getImageUrl(), c.isActive(), c.getSortOrder(),
                        countsByCollection.getOrDefault(c.getId(), 0L), c.getCreatedAt()
                ))
                .toList();
    }

    private Map<UUID, String> loadCollectionNames() {
        return collectionRepository.findAll().stream()
                .collect(Collectors.toMap(Collection::getId, Collection::getName));
    }

    private Map<UUID, Long> loadCollectionCounts() {
        return productRepository.countActiveByCollection().stream()
                .filter(row -> row[0] != null)
                .collect(Collectors.toMap(
                        row -> (UUID) row[0],
                        row -> (Long) row[1]
                ));
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
                p.getStockQuantity() > 0 || p.isTest(),
                p.getCareInstructions()
        );
    }
}
