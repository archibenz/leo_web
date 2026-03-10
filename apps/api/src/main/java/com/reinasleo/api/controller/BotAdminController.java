package com.reinasleo.api.controller;

import com.reinasleo.api.dto.*;
import com.reinasleo.api.service.AdminProductService;
import com.reinasleo.api.service.CollectionService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/bot/admin")
public class BotAdminController {

    private final AdminProductService adminProductService;
    private final CollectionService collectionService;

    @Value("${app.bot.api-secret}")
    private String botApiSecret;

    public BotAdminController(AdminProductService adminProductService,
                              CollectionService collectionService) {
        this.adminProductService = adminProductService;
        this.collectionService = collectionService;
    }

    private void validateSecret(String secret) {
        if (secret == null || !secret.equals(botApiSecret)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_bot_secret");
        }
    }

    @GetMapping("/dashboard")
    public ResponseEntity<DashboardResponse> dashboard(
            @RequestHeader("X-Bot-Secret") String secret) {
        validateSecret(secret);
        return ResponseEntity.ok(adminProductService.getDashboard());
    }

    @GetMapping("/products")
    public ResponseEntity<List<AdminProductResponse>> products(
            @RequestHeader("X-Bot-Secret") String secret) {
        validateSecret(secret);
        return ResponseEntity.ok(adminProductService.listAll());
    }

    @PatchMapping("/products/{id}/stock")
    public ResponseEntity<AdminProductResponse> updateStock(
            @RequestHeader("X-Bot-Secret") String secret,
            @PathVariable String id,
            @RequestBody InventoryUpdateRequest request) {
        validateSecret(secret);
        return ResponseEntity.ok(adminProductService.updateStock(id, request.quantity()));
    }

    @GetMapping("/alerts")
    public ResponseEntity<List<StockAlertResponse>> alerts(
            @RequestHeader("X-Bot-Secret") String secret) {
        validateSecret(secret);
        return ResponseEntity.ok(adminProductService.getAlerts());
    }

    @PostMapping("/alerts/{id}/acknowledge")
    public ResponseEntity<Void> acknowledgeAlert(
            @RequestHeader("X-Bot-Secret") String secret,
            @PathVariable UUID id) {
        validateSecret(secret);
        adminProductService.acknowledgeAlert(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/collections")
    public ResponseEntity<List<CollectionResponse>> collections(
            @RequestHeader("X-Bot-Secret") String secret) {
        validateSecret(secret);
        return ResponseEntity.ok(collectionService.listAll());
    }
}
