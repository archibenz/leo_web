package com.reinasleo.api.service;

import com.reinasleo.api.dto.CollectionResponse;
import com.reinasleo.api.dto.PublicProductDetailResponse;
import com.reinasleo.api.dto.PublicProductResponse;
import com.reinasleo.api.model.Collection;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.repository.CollectionRepository;
import com.reinasleo.api.repository.ProductRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class PublicCatalogService {

    private final ProductRepository productRepository;
    private final CollectionRepository collectionRepository;

    public PublicCatalogService(ProductRepository productRepository,
                                CollectionRepository collectionRepository) {
        this.productRepository = productRepository;
        this.collectionRepository = collectionRepository;
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
