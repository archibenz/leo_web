package com.reinasleo.api.controller;

import com.reinasleo.api.dto.CollectionResponse;
import com.reinasleo.api.dto.HomepageResponse;
import com.reinasleo.api.dto.PublicProductDetailResponse;
import com.reinasleo.api.dto.PublicProductResponse;
import com.reinasleo.api.service.PublicCatalogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/catalog")
public class PublicCatalogController {

    private final PublicCatalogService catalogService;

    public PublicCatalogController(PublicCatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/products")
    public ResponseEntity<List<PublicProductResponse>> listProducts() {
        return ResponseEntity.ok(catalogService.listActiveProducts());
    }

    @GetMapping("/products/{id}")
    public ResponseEntity<PublicProductDetailResponse> getProduct(@PathVariable String id) {
        return ResponseEntity.ok(catalogService.getProductDetail(id));
    }

    @GetMapping("/collections")
    public ResponseEntity<List<CollectionResponse>> listCollections() {
        return ResponseEntity.ok(catalogService.listActiveCollections());
    }

    @GetMapping("/collections/{slug}")
    public ResponseEntity<List<PublicProductResponse>> getCollectionProducts(@PathVariable String slug) {
        return ResponseEntity.ok(catalogService.getCollectionProducts(slug));
    }

    @GetMapping("/products/{id}/recommendations")
    public ResponseEntity<List<PublicProductResponse>> getProductRecommendations(@PathVariable String id) {
        return ResponseEntity.ok(catalogService.getProductRecommendations(id));
    }

    @GetMapping("/homepage")
    public ResponseEntity<HomepageResponse> getHomepage() {
        return ResponseEntity.ok(catalogService.getHomepage());
    }
}
