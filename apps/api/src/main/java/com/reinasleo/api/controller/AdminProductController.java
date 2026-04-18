package com.reinasleo.api.controller;

import com.reinasleo.api.dto.AdminProductRequest;
import com.reinasleo.api.dto.AdminProductResponse;
import com.reinasleo.api.dto.InventoryUpdateRequest;
import com.reinasleo.api.service.AdminProductService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/admin/products")
public class AdminProductController {

    private final AdminProductService adminProductService;

    public AdminProductController(AdminProductService adminProductService) {
        this.adminProductService = adminProductService;
    }

    @GetMapping
    public ResponseEntity<List<AdminProductResponse>> list() {
        return ResponseEntity.ok(adminProductService.listAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdminProductResponse> get(@PathVariable String id) {
        return ResponseEntity.ok(adminProductService.getById(id));
    }

    @PostMapping
    public ResponseEntity<AdminProductResponse> create(@RequestBody AdminProductRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminProductService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AdminProductResponse> update(@PathVariable String id,
                                                        @RequestBody AdminProductRequest request) {
        return ResponseEntity.ok(adminProductService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id,
                                       @RequestParam(defaultValue = "false") boolean permanent) {
        if (permanent) {
            adminProductService.hardDelete(id);
        } else {
            adminProductService.deactivate(id);
        }
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/stock")
    public ResponseEntity<AdminProductResponse> updateStock(@PathVariable String id,
                                                             @RequestBody InventoryUpdateRequest request) {
        return ResponseEntity.ok(adminProductService.updateStock(id, request.quantity()));
    }

}
