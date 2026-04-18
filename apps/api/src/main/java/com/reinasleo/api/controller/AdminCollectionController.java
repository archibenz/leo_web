package com.reinasleo.api.controller;

import com.reinasleo.api.dto.CollectionRequest;
import com.reinasleo.api.dto.CollectionResponse;
import com.reinasleo.api.service.CollectionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
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
    public ResponseEntity<List<CollectionResponse>> list() {
        return ResponseEntity.ok(collectionService.listAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CollectionResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(collectionService.getById(id));
    }

    @PostMapping
    public ResponseEntity<CollectionResponse> create(@RequestBody CollectionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(collectionService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CollectionResponse> update(@PathVariable UUID id,
                                                      @RequestBody CollectionRequest request) {
        return ResponseEntity.ok(collectionService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id,
                                       @RequestParam(defaultValue = "false") boolean permanent) {
        if (permanent) {
            collectionService.hardDelete(id);
        } else {
            collectionService.deactivate(id);
        }
        return ResponseEntity.noContent().build();
    }

}
