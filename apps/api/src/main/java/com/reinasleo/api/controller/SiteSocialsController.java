package com.reinasleo.api.controller;

import com.reinasleo.api.dto.PublicSocialLink;
import com.reinasleo.api.dto.SocialLink;
import com.reinasleo.api.dto.SocialLinksRequest;
import com.reinasleo.api.service.SiteSocialsService;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Соцсети сайта. Читает витрина (без входа), пишет администратор. Проверка
 * адресов — в SiteSocialsService.
 */
@RestController
public class SiteSocialsController {

    private final SiteSocialsService socials;

    public SiteSocialsController(SiteSocialsService socials) {
        this.socials = socials;
    }

    @GetMapping("/api/site/socials")
    public ResponseEntity<List<PublicSocialLink>> shown() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofSeconds(60)).cachePublic())
                .body(socials.shown());
    }

    @GetMapping("/api/admin/site/socials")
    public ResponseEntity<Map<String, List<SocialLink>>> all() {
        return ResponseEntity.ok(Map.of("links", socials.all()));
    }

    @PutMapping("/api/admin/site/socials")
    public ResponseEntity<Map<String, List<SocialLink>>> save(@Valid @RequestBody SocialLinksRequest request) {
        return ResponseEntity.ok(Map.of("links", socials.save(request)));
    }
}
