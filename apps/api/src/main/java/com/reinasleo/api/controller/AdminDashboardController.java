package com.reinasleo.api.controller;

import com.reinasleo.api.dto.DashboardResponse;
import com.reinasleo.api.dto.StockAlertResponse;
import com.reinasleo.api.model.User;
import com.reinasleo.api.service.AdminProductService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

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
    public ResponseEntity<DashboardResponse> dashboard(@AuthenticationPrincipal User user) {
        requireAdmin(user);
        return ResponseEntity.ok(adminProductService.getDashboard());
    }

    @GetMapping("/alerts")
    public ResponseEntity<List<StockAlertResponse>> alerts(@AuthenticationPrincipal User user) {
        requireAdmin(user);
        return ResponseEntity.ok(adminProductService.getAlerts());
    }

    @PostMapping("/alerts/{id}/acknowledge")
    public ResponseEntity<Void> acknowledgeAlert(@AuthenticationPrincipal User user,
                                                  @PathVariable UUID id) {
        requireAdmin(user);
        adminProductService.acknowledgeAlert(id);
        return ResponseEntity.ok().build();
    }

    private void requireAdmin(User user) {
        if (user == null || !"admin".equals(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }
}
