package com.reinasleo.api.controller;

import com.reinasleo.api.dto.PopularProductResponse;
import com.reinasleo.api.model.User;
import com.reinasleo.api.service.AnalyticsService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/admin/analytics")
public class AdminAnalyticsController {

    private final AnalyticsService analyticsService;

    public AdminAnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/popular-products")
    public ResponseEntity<List<PopularProductResponse>> popularProducts(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "10") int limit) {
        requireAdmin(user);
        return ResponseEntity.ok(analyticsService.getPopularProducts(limit));
    }

    private void requireAdmin(User user) {
        if (user == null || !"admin".equals(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "admin_required");
        }
    }
}
