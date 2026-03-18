package com.reinasleo.api.controller;

import com.reinasleo.api.model.SiteConfig;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.SiteConfigRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/admin/config")
public class AdminSiteConfigController {

    private final SiteConfigRepository siteConfigRepository;

    public AdminSiteConfigController(SiteConfigRepository siteConfigRepository) {
        this.siteConfigRepository = siteConfigRepository;
    }

    @GetMapping
    public ResponseEntity<List<SiteConfig>> listAll(@AuthenticationPrincipal User user) {
        requireAdmin(user);
        return ResponseEntity.ok(siteConfigRepository.findAll());
    }

    @PutMapping("/{key}")
    public ResponseEntity<SiteConfig> update(@AuthenticationPrincipal User user,
                                              @PathVariable String key,
                                              @RequestBody String value) {
        requireAdmin(user);
        SiteConfig config = siteConfigRepository.findById(key)
                .orElseGet(() -> {
                    var c = new SiteConfig();
                    c.setKey(key);
                    return c;
                });
        config.setValue(value);
        return ResponseEntity.ok(siteConfigRepository.save(config));
    }

    private void requireAdmin(User user) {
        if (user == null || !"admin".equals(user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }
}
