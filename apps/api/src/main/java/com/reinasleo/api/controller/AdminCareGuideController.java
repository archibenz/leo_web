package com.reinasleo.api.controller;

import com.reinasleo.api.dto.CareGuideRequest;
import com.reinasleo.api.dto.CareGuideResponse;
import com.reinasleo.api.model.User;
import com.reinasleo.api.service.CareGuideService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/care-guides")
public class AdminCareGuideController {

    private final CareGuideService careGuideService;

    public AdminCareGuideController(CareGuideService careGuideService) {
        this.careGuideService = careGuideService;
    }

    @GetMapping
    public ResponseEntity<List<CareGuideResponse>> list(@AuthenticationPrincipal User user) {
        requireAdmin(user);
        return ResponseEntity.ok(careGuideService.listAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CareGuideResponse> get(@AuthenticationPrincipal User user,
                                                  @PathVariable UUID id) {
        requireAdmin(user);
        return ResponseEntity.ok(careGuideService.getById(id));
    }

    @PostMapping
    public ResponseEntity<CareGuideResponse> create(@AuthenticationPrincipal User user,
                                                     @Valid @RequestBody CareGuideRequest request) {
        requireAdmin(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(careGuideService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CareGuideResponse> update(@AuthenticationPrincipal User user,
                                                     @PathVariable UUID id,
                                                     @Valid @RequestBody CareGuideRequest request) {
        requireAdmin(user);
        return ResponseEntity.ok(careGuideService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User user,
                                       @PathVariable UUID id) {
        requireAdmin(user);
        careGuideService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private void requireAdmin(User user) {
        if (user == null || !"admin".equals(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }
}
