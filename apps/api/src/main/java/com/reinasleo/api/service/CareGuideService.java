package com.reinasleo.api.service;

import com.reinasleo.api.dto.CareGuideRequest;
import com.reinasleo.api.dto.CareGuideResponse;
import com.reinasleo.api.model.CareGuide;
import com.reinasleo.api.repository.CareGuideRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class CareGuideService {

    private final CareGuideRepository careGuideRepository;

    public CareGuideService(CareGuideRepository careGuideRepository) {
        this.careGuideRepository = careGuideRepository;
    }

    @Transactional(readOnly = true)
    public List<CareGuideResponse> listActive() {
        return careGuideRepository.findByActiveTrueOrderBySortOrderAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CareGuideResponse> listAll() {
        return careGuideRepository.findAllByOrderBySortOrderAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CareGuideResponse getById(UUID id) {
        CareGuide g = careGuideRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Care guide not found"));
        return toResponse(g);
    }

    @Transactional
    public CareGuideResponse create(CareGuideRequest req) {
        CareGuide g = new CareGuide();
        applyRequest(g, req);
        return toResponse(careGuideRepository.save(g));
    }

    @Transactional
    public CareGuideResponse update(UUID id, CareGuideRequest req) {
        CareGuide g = careGuideRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Care guide not found"));
        applyRequest(g, req);
        return toResponse(careGuideRepository.save(g));
    }

    @Transactional
    public void delete(UUID id) {
        CareGuide g = careGuideRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Care guide not found"));
        careGuideRepository.delete(g);
    }

    private void applyRequest(CareGuide g, CareGuideRequest req) {
        g.setTitle(req.title());
        g.setDescription(req.description());
        g.setTips(req.tips());
        g.setImage(req.image());
        if (req.careSymbols() != null) g.setCareSymbols(req.careSymbols());
        if (req.sortOrder() != null) g.setSortOrder(req.sortOrder());
        if (req.active() != null) g.setActive(req.active());
    }

    private CareGuideResponse toResponse(CareGuide g) {
        return new CareGuideResponse(
                g.getId(), g.getTitle(), g.getDescription(), g.getTips(),
                g.getImage(), g.getCareSymbols(), g.getSortOrder(),
                g.isActive(), g.getCreatedAt()
        );
    }
}
