package com.reinasleo.api.controller;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@RestController
public class LookbookController {

    @GetMapping("/api/lookbook")
    public ResponseEntity<List<Map<String, String>>> list() {
        List<Map<String, String>> items = List.of(
                Map.of("slug", "evening", "title", "Evening", "description", "Editorial silhouettes for night."),
                Map.of("slug", "everyday", "title", "Everyday", "description", "Elevated staples."),
                Map.of("slug", "outerwear", "title", "Outerwear", "description", "Structured coats and layers.")
        );

        return ResponseEntity
                .ok()
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)))
                .body(items);
    }
}
