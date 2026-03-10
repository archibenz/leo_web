package com.reinasleo.api.controller;

import com.reinasleo.api.dto.CollectionRequest;
import com.reinasleo.api.dto.CollectionResponse;
import com.reinasleo.api.model.User;
import com.reinasleo.api.service.CollectionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/collections")
public class AdminCollectionController {

    private final CollectionService collectionService;

    public AdminCollectionController(CollectionService collectionService) {
        this.collectionService = collectionService;
    }

    @GetMapping
    public ResponseEntity<List<CollectionResponse>> list(@AuthenticationPrincipal User user) {
        requireAdmin(user);
        return ResponseEntity.ok(collectionService.listAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CollectionResponse> get(@AuthenticationPrincipal User user,
                                                   @PathVariable UUID id) {
        requireAdmin(user);
        return ResponseEntity.ok(collectionService.getById(id));
    }

    @PostMapping
    public ResponseEntity<CollectionResponse> create(@AuthenticationPrincipal User user,
                                                      @RequestBody CollectionRequest request) {
        requireAdmin(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(collectionService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CollectionResponse> update(@AuthenticationPrincipal User user,
                                                      @PathVariable UUID id,
                                                      @RequestBody CollectionRequest request) {
        requireAdmin(user);
        return ResponseEntity.ok(collectionService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User user,
                                       @PathVariable UUID id,
                                       @RequestParam(defaultValue = "false") boolean permanent) {
        requireAdmin(user);
        if (permanent) {
            collectionService.hardDelete(id);
        } else {
            collectionService.deactivate(id);
        }
        return ResponseEntity.noContent().build();
    }

    private void requireAdmin(User user) {
        if (user == null || !"admin".equals(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }
}
