package com.reinasleo.api.controller;

import com.reinasleo.api.dto.*;
import com.reinasleo.api.service.AdminProductService;
import com.reinasleo.api.service.CollectionService;
import com.reinasleo.api.util.ImageContentValidator;
import jakarta.annotation.PostConstruct;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/bot/admin")
public class BotAdminController {

    private final AdminProductService adminProductService;
    private final CollectionService collectionService;

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/jpg"
    );
    private static final long MAX_UPLOAD_SIZE = 10L * 1024 * 1024; // 10MB

    @Value("${app.bot.api-secret}")
    private String botApiSecret;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    public BotAdminController(AdminProductService adminProductService,
                              CollectionService collectionService) {
        this.adminProductService = adminProductService;
        this.collectionService = collectionService;
    }

    @PostConstruct
    void validateBotSecretConfigured() {
        if (botApiSecret == null || botApiSecret.isBlank()) {
            throw new IllegalStateException(
                    "BOT_API_SECRET env var is required — refusing to start. "
                            + "An empty value would bypass bot auth and open all /api/bot/admin/** endpoints.");
        }
    }

    private void validateSecret(String secret) {
        if (secret == null || !MessageDigest.isEqual(
                secret.getBytes(StandardCharsets.UTF_8),
                botApiSecret.getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_bot_secret");
        }
    }

    @GetMapping("/dashboard")
    public ResponseEntity<DashboardResponse> dashboard(
            @RequestHeader("X-Bot-Secret") String secret) {
        validateSecret(secret);
        return ResponseEntity.ok(adminProductService.getDashboard());
    }

    @GetMapping("/products")
    public ResponseEntity<List<AdminProductResponse>> products(
            @RequestHeader("X-Bot-Secret") String secret) {
        validateSecret(secret);
        return ResponseEntity.ok(adminProductService.listAll());
    }

    @PatchMapping("/products/{id}/stock")
    public ResponseEntity<AdminProductResponse> updateStock(
            @RequestHeader("X-Bot-Secret") String secret,
            @PathVariable String id,
            @Valid @RequestBody InventoryUpdateRequest request) {
        validateSecret(secret);
        return ResponseEntity.ok(adminProductService.updateStock(id, request.quantity()));
    }

    @GetMapping("/alerts")
    public ResponseEntity<List<StockAlertResponse>> alerts(
            @RequestHeader("X-Bot-Secret") String secret) {
        validateSecret(secret);
        return ResponseEntity.ok(adminProductService.getAlerts());
    }

    @PostMapping("/alerts/{id}/acknowledge")
    public ResponseEntity<Void> acknowledgeAlert(
            @RequestHeader("X-Bot-Secret") String secret,
            @PathVariable UUID id) {
        validateSecret(secret);
        adminProductService.acknowledgeAlert(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/collections")
    public ResponseEntity<List<CollectionResponse>> collections(
            @RequestHeader("X-Bot-Secret") String secret) {
        validateSecret(secret);
        return ResponseEntity.ok(collectionService.listAll());
    }

    @PostMapping("/products")
    public ResponseEntity<AdminProductResponse> createProduct(
            @RequestHeader("X-Bot-Secret") String secret,
            @Valid @RequestBody AdminProductRequest request) {
        validateSecret(secret);
        return ResponseEntity.ok(adminProductService.create(request));
    }

    @PutMapping("/products/{id}")
    public ResponseEntity<AdminProductResponse> updateProduct(
            @RequestHeader("X-Bot-Secret") String secret,
            @PathVariable String id,
            @Valid @RequestBody AdminProductRequest request) {
        validateSecret(secret);
        return ResponseEntity.ok(adminProductService.update(id, request));
    }

    @DeleteMapping("/products/{id}")
    public ResponseEntity<Void> deleteProduct(
            @RequestHeader("X-Bot-Secret") String secret,
            @PathVariable String id,
            @RequestParam(defaultValue = "false") boolean permanent) {
        validateSecret(secret);
        if (permanent) {
            adminProductService.hardDelete(id);
        } else {
            adminProductService.deactivate(id);
        }
        return ResponseEntity.ok().build();
    }

    @PostMapping("/collections")
    public ResponseEntity<CollectionResponse> createCollection(
            @RequestHeader("X-Bot-Secret") String secret,
            @Valid @RequestBody CollectionRequest request) {
        validateSecret(secret);
        return ResponseEntity.ok(collectionService.create(request));
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> upload(
            @RequestHeader("X-Bot-Secret") String secret,
            @RequestParam("file") MultipartFile file) {
        validateSecret(secret);

        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty");
        }
        if (file.getSize() > MAX_UPLOAD_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File too large (max 10MB)");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only JPG, PNG, WebP");
        }
        try {
            if (!ImageContentValidator.isSupportedImage(file)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "uploaded file is not a valid image");
            }
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to read uploaded file");
        }
        try {
            Path uploadPath = Paths.get(uploadDir, "products");
            Files.createDirectories(uploadPath);
            String originalName = file.getOriginalFilename();
            String ext = "";
            if (originalName != null && originalName.contains(".")) {
                String rawExt = originalName.substring(originalName.lastIndexOf("."));
                if (rawExt.matches("\\.[a-zA-Z0-9]{1,10}")) {
                    ext = rawExt;
                }
            }
            String filename = UUID.randomUUID() + ext;
            Path filePath = uploadPath.resolve(filename).normalize();
            if (!filePath.startsWith(uploadPath)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid filename");
            }
            file.transferTo(filePath.toFile());
            return ResponseEntity.ok(Map.of("url", "/uploads/products/" + filename));
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Upload failed");
        }
    }
}
