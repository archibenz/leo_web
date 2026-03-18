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
import java.util.stream.IntStream;

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
            return ids.stream()
                    .map(id -> productRepository.findById(id).orElse(null))
                    .filter(p -> p != null && p.isActive())
                    .toList();
        }

        // Fallback: products from the same collection
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

    @Transactional
    public void setRecommendations(String productId, List<String> recommendedProductIds) {
        productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        recommendationRepository.deleteAllByProductId(productId);

        List<ProductRecommendation> recs = IntStream.range(0, recommendedProductIds.size())
                .mapToObj(i -> {
                    var rec = new ProductRecommendation();
                    rec.setProductId(productId);
                    rec.setRecommendedProductId(recommendedProductIds.get(i));
                    rec.setSortOrder(i);
                    return rec;
                })
                .toList();

        recommendationRepository.saveAll(recs);
    }

    @Transactional
    public void addRecommendation(String productId, String recommendedProductId) {
        productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        productRepository.findById(recommendedProductId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recommended product not found"));

        List<ProductRecommendation> existing = recommendationRepository.findByProductIdOrderBySortOrderAsc(productId);
        int nextOrder = existing.stream()
                .mapToInt(ProductRecommendation::getSortOrder)
                .max()
                .orElse(-1) + 1;

        var rec = new ProductRecommendation();
        rec.setProductId(productId);
        rec.setRecommendedProductId(recommendedProductId);
        rec.setSortOrder(nextOrder);
        recommendationRepository.save(rec);
    }

    @Transactional
    public void removeRecommendation(String productId, String recommendedProductId) {
        recommendationRepository.deleteByProductIdAndRecommendedProductId(productId, recommendedProductId);
    }
}
