package com.reinasleo.api.controller;

import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.User;
import com.reinasleo.api.service.RecommendationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/products/{id}/recommendations")
public class AdminRecommendationController {

    private final RecommendationService recommendationService;

    public AdminRecommendationController(RecommendationService recommendationService) {
        this.recommendationService = recommendationService;
    }

    @GetMapping
    public ResponseEntity<List<Product>> list(@AuthenticationPrincipal User user,
                                               @PathVariable String id) {
        requireAdmin(user);
        return ResponseEntity.ok(recommendationService.getRecommendations(id));
    }

    @PutMapping
    public ResponseEntity<Void> setAll(@AuthenticationPrincipal User user,
                                        @PathVariable String id,
                                        @RequestBody Map<String, List<String>> body) {
        requireAdmin(user);
        List<String> productIds = body.get("productIds");
        if (productIds == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "productIds required");
        }
        recommendationService.setRecommendations(id, productIds);
        return ResponseEntity.ok().build();
    }

    @PostMapping
    public ResponseEntity<Void> add(@AuthenticationPrincipal User user,
                                     @PathVariable String id,
                                     @RequestBody Map<String, String> body) {
        requireAdmin(user);
        String recommendedProductId = body.get("recommendedProductId");
        if (recommendedProductId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "recommendedProductId required");
        }
        recommendationService.addRecommendation(id, recommendedProductId);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{recommendedProductId}")
    public ResponseEntity<Void> remove(@AuthenticationPrincipal User user,
                                        @PathVariable String id,
                                        @PathVariable String recommendedProductId) {
        requireAdmin(user);
        recommendationService.removeRecommendation(id, recommendedProductId);
        return ResponseEntity.noContent().build();
    }

    private void requireAdmin(User user) {
        if (user == null || !"admin".equals(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }
}
