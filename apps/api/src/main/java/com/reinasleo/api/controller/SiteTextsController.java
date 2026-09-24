package com.reinasleo.api.controller;

import com.reinasleo.api.dto.SiteTextsRequest;
import com.reinasleo.api.service.SiteTextsService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/** «Тексты сайта». Читает витрина (без входа), пишет администратор. */
@RestController
public class SiteTextsController {

    private final SiteTextsService texts;

    public SiteTextsController(SiteTextsService texts) {
        this.texts = texts;
    }

    @GetMapping("/api/site/texts")
    public ResponseEntity<SiteTextsRequest> edits() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofSeconds(60)).cachePublic())
                .body(texts.edits());
    }

    @GetMapping("/api/admin/site/texts")
    public ResponseEntity<SiteTextsRequest> adminEdits() {
        return ResponseEntity.ok(texts.edits());
    }

    @PutMapping("/api/admin/site/texts")
    public ResponseEntity<SiteTextsRequest> save(@RequestBody SiteTextsRequest request) {
        return ResponseEntity.ok(texts.save(request));
    }
}
