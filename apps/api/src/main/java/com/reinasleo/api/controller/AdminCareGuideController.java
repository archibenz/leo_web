package com.reinasleo.api.controller;

import com.reinasleo.api.dto.CareGuideRequest;
import com.reinasleo.api.dto.CareGuideResponse;
import com.reinasleo.api.service.CareGuideService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
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
    public ResponseEntity<List<CareGuideResponse>> list() {
        return ResponseEntity.ok(careGuideService.listAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CareGuideResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(careGuideService.getById(id));
    }

    @PostMapping
    public ResponseEntity<CareGuideResponse> create(@Valid @RequestBody CareGuideRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(careGuideService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CareGuideResponse> update(@PathVariable UUID id,
                                                     @Valid @RequestBody CareGuideRequest request) {
        return ResponseEntity.ok(careGuideService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        careGuideService.delete(id);
        return ResponseEntity.noContent().build();
    }

}
