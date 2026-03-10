package com.reinasleo.api.service;

import com.reinasleo.api.dto.CollectionRequest;
import com.reinasleo.api.dto.CollectionResponse;
import com.reinasleo.api.model.Collection;
import com.reinasleo.api.repository.CollectionRepository;
import com.reinasleo.api.repository.ProductRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class CollectionService {

    private final CollectionRepository collectionRepository;
    private final ProductRepository productRepository;

    public CollectionService(CollectionRepository collectionRepository,
                             ProductRepository productRepository) {
        this.collectionRepository = collectionRepository;
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public List<CollectionResponse> listAll() {
        return collectionRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CollectionResponse> listActive() {
        return collectionRepository.findByActiveTrueOrderBySortOrderAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CollectionResponse getById(UUID id) {
        Collection c = collectionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Collection not found"));
        return toResponse(c);
    }

    @Transactional(readOnly = true)
    public CollectionResponse getBySlug(String slug) {
        Collection c = collectionRepository.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Collection not found"));
        return toResponse(c);
    }

    @Transactional
    public CollectionResponse create(CollectionRequest req) {
        Collection c = new Collection();
        c.setName(req.name());
        c.setSlug(generateSlug(req.name()));
        c.setDescription(req.description());
        c.setImageUrl(req.imageUrl());
        if (req.sortOrder() != null) {
            c.setSortOrder(req.sortOrder());
        }
        Collection saved = collectionRepository.save(c);
        return toResponse(saved);
    }

    @Transactional
    public CollectionResponse update(UUID id, CollectionRequest req) {
        Collection c = collectionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Collection not found"));
        c.setName(req.name());
        c.setSlug(generateSlug(req.name()));
        c.setDescription(req.description());
        c.setImageUrl(req.imageUrl());
        if (req.sortOrder() != null) {
            c.setSortOrder(req.sortOrder());
        }
        Collection saved = collectionRepository.save(c);
        return toResponse(saved);
    }

    @Transactional
    public void deactivate(UUID id) {
        Collection c = collectionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Collection not found"));
        c.setActive(false);
        collectionRepository.save(c);
    }

    @Transactional
    public void hardDelete(UUID id) {
        Collection c = collectionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Collection not found"));
        // Unlink products from this collection
        productRepository.findByCollectionId(id).forEach(p -> {
            p.setCollectionId(null);
            productRepository.save(p);
        });
        collectionRepository.delete(c);
    }

    private String generateSlug(String name) {
        return name.toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }

    private CollectionResponse toResponse(Collection c) {
        long productCount = productRepository.findByCollectionIdAndActiveTrueOrderByCreatedAtDesc(c.getId()).size();
        return new CollectionResponse(
                c.getId(), c.getName(), c.getSlug(), c.getDescription(),
                c.getImageUrl(), c.isActive(), c.getSortOrder(),
                productCount, c.getCreatedAt()
        );
    }
}
