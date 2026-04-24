package com.reinasleo.api.controller;

import com.reinasleo.api.dto.BotVisitStatPoint;
import com.reinasleo.api.dto.DashboardResponse;
import com.reinasleo.api.dto.RecentOrderResponse;
import com.reinasleo.api.dto.RegistrationStatPoint;
import com.reinasleo.api.dto.StockAlertResponse;
import com.reinasleo.api.dto.TopProductPoint;
import com.reinasleo.api.service.AdminProductService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminDashboardController {

    private final AdminProductService adminProductService;

    public AdminDashboardController(AdminProductService adminProductService) {
        this.adminProductService = adminProductService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<DashboardResponse> dashboard() {
        return ResponseEntity.ok(adminProductService.getDashboard());
    }

    @GetMapping("/alerts")
    public ResponseEntity<List<StockAlertResponse>> alerts() {
        return ResponseEntity.ok(adminProductService.getAlerts());
    }

    @GetMapping("/orders/recent")
    public ResponseEntity<List<RecentOrderResponse>> recentOrders() {
        return ResponseEntity.ok(adminProductService.getRecentOrders());
    }

    @GetMapping("/stats/registrations")
    public ResponseEntity<List<RegistrationStatPoint>> registrationStats(
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(adminProductService.getRegistrationStats(days));
    }

    @GetMapping("/stats/bot-visits")
    public ResponseEntity<List<BotVisitStatPoint>> botVisitStats(
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(adminProductService.getBotVisitStats(days));
    }

    @GetMapping("/stats/top-products")
    public ResponseEntity<List<TopProductPoint>> topProducts(
            @RequestParam(defaultValue = "add_to_favorite") String eventType,
            @RequestParam(defaultValue = "30") int days,
            @RequestParam(defaultValue = "5") int limit) {
        return ResponseEntity.ok(adminProductService.getTopProducts(eventType, days, limit));
    }

    @PostMapping("/alerts/{id}/acknowledge")
    public ResponseEntity<Void> acknowledgeAlert(@PathVariable UUID id) {
        adminProductService.acknowledgeAlert(id);
        return ResponseEntity.ok().build();
    }

}
