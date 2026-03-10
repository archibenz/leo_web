package com.reinasleo.api.controller;

import com.reinasleo.api.dto.AdminProductRequest;
import com.reinasleo.api.dto.AdminProductResponse;
import com.reinasleo.api.dto.InventoryUpdateRequest;
import com.reinasleo.api.model.User;
import com.reinasleo.api.service.AdminProductService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/admin/products")
public class AdminProductController {

    private final AdminProductService adminProductService;

    public AdminProductController(AdminProductService adminProductService) {
        this.adminProductService = adminProductService;
    }

    @GetMapping
    public ResponseEntity<List<AdminProductResponse>> list(@AuthenticationPrincipal User user) {
        requireAdmin(user);
        return ResponseEntity.ok(adminProductService.listAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdminProductResponse> get(@AuthenticationPrincipal User user,
                                                     @PathVariable String id) {
        requireAdmin(user);
        return ResponseEntity.ok(adminProductService.getById(id));
    }

    @PostMapping
    public ResponseEntity<AdminProductResponse> create(@AuthenticationPrincipal User user,
                                                        @RequestBody AdminProductRequest request) {
        requireAdmin(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(adminProductService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AdminProductResponse> update(@AuthenticationPrincipal User user,
                                                        @PathVariable String id,
                                                        @RequestBody AdminProductRequest request) {
        requireAdmin(user);
        return ResponseEntity.ok(adminProductService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User user,
                                       @PathVariable String id,
                                       @RequestParam(defaultValue = "false") boolean permanent) {
        requireAdmin(user);
        if (permanent) {
            adminProductService.hardDelete(id);
        } else {
            adminProductService.deactivate(id);
        }
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/stock")
    public ResponseEntity<AdminProductResponse> updateStock(@AuthenticationPrincipal User user,
                                                             @PathVariable String id,
                                                             @RequestBody InventoryUpdateRequest request) {
        requireAdmin(user);
        return ResponseEntity.ok(adminProductService.updateStock(id, request.quantity()));
    }

    private void requireAdmin(User user) {
        if (user == null || !"admin".equals(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }
}
