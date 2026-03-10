package com.reinasleo.api.controller;

import com.reinasleo.api.dto.ContactRequest;
import com.reinasleo.api.model.ContactMessage;
import com.reinasleo.api.service.ContactService;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.Map;

@RestController
@RequestMapping("/api/contact")
public class ContactController {

    private final ContactService contactService;

    public ContactController(ContactService contactService) {
        this.contactService = contactService;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> submit(@Valid @RequestBody ContactRequest request) {
        ContactMessage saved = contactService.save(request);
        Map<String, Object> body = Map.of(
                "status", "received",
                "id", saved.id(),
                "receivedAt", saved.receivedAt()
        );
        return ResponseEntity
                .ok()
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(1)))
                .body(body);
    }
}
