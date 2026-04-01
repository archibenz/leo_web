package com.reinasleo.api.controller;

import com.reinasleo.api.dto.CareGuideResponse;
import com.reinasleo.api.service.CareGuideService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/care-guides")
public class PublicCareGuideController {

    private final CareGuideService careGuideService;

    public PublicCareGuideController(CareGuideService careGuideService) {
        this.careGuideService = careGuideService;
    }

    @GetMapping
    public ResponseEntity<List<CareGuideResponse>> list() {
        return ResponseEntity.ok(careGuideService.listActive());
    }
}
