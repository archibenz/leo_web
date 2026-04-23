package com.reinasleo.api.service;

import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.ProductRecommendation;
import com.reinasleo.api.repository.ProductRecommendationRepository;
import com.reinasleo.api.repository.ProductRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class RecommendationService {

    private final ProductRecommendationRepository recommendationRepository;
    private final ProductRepository productRepository;

    public RecommendationService(ProductRecommendationRepository recommendationRepository,
                                  ProductRepository productRepository) {
        this.recommendationRepository = recommendationRepository;
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public List<Product> getRecommendations(String productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        List<ProductRecommendation> manual = recommendationRepository.findByProductIdOrderBySortOrderAsc(productId);

        if (!manual.isEmpty()) {
            List<String> ids = manual.stream()
                    .map(ProductRecommendation::getRecommendedProductId)
                    .toList();
            java.util.Map<String, Product> productMap = productRepository.findByIdInAndActiveTrue(ids).stream()
                    .collect(java.util.stream.Collectors.toMap(Product::getId, p -> p));
            return ids.stream()
                    .map(productMap::get)
                    .filter(java.util.Objects::nonNull)
                    .toList();
        }

        if (product.getCollectionId() != null) {
            return productRepository
                    .findByCollectionIdAndActiveTrueOrderByCreatedAtDesc(product.getCollectionId())
                    .stream()
                    .filter(p -> !p.getId().equals(productId))
                    .limit(8)
                    .toList();
        }

        return List.of();
    }
}
