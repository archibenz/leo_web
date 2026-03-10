package com.reinasleo.api.controller;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/api/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity
                .ok()
                .cacheControl(CacheControl.maxAge(Duration.ofSeconds(30)))
                .body(Map.of("status", "UP"));
    }
}
