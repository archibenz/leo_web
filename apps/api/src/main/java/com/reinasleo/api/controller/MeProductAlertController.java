package com.reinasleo.api.controller;

import com.reinasleo.api.dto.ProductAlertListResponse;
import com.reinasleo.api.dto.ProductAlertRequest;
import com.reinasleo.api.dto.ProductAlertResponse;
import com.reinasleo.api.model.User;
import com.reinasleo.api.service.ProductStockAlertService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/me/product-alerts")
public class MeProductAlertController {

    private final ProductStockAlertService alertService;

    public MeProductAlertController(ProductStockAlertService alertService) {
        this.alertService = alertService;
    }

    @GetMapping
    public ResponseEntity<ProductAlertListResponse> list(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(new ProductAlertListResponse(
                alertService.listProductIds(user), user.getTelegramId() != null));
    }

    @PostMapping
    public ResponseEntity<ProductAlertResponse> subscribe(@AuthenticationPrincipal User user,
                                                          @Valid @RequestBody ProductAlertRequest request) {
        return ResponseEntity.ok(alertService.subscribe(user, request.productId()));
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<Void> unsubscribe(@AuthenticationPrincipal User user,
                                            @PathVariable String productId) {
        alertService.unsubscribe(user, productId);
        return ResponseEntity.noContent().build();
    }
}
