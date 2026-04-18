package com.reinasleo.api.controller;

import com.reinasleo.api.dto.DashboardResponse;
import com.reinasleo.api.dto.RecentOrderResponse;
import com.reinasleo.api.dto.StockAlertResponse;
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

    @PostMapping("/alerts/{id}/acknowledge")
    public ResponseEntity<Void> acknowledgeAlert(@PathVariable UUID id) {
        adminProductService.acknowledgeAlert(id);
        return ResponseEntity.ok().build();
    }

}
