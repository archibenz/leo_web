package com.reinasleo.api.controller;

import com.reinasleo.api.dto.*;
import com.reinasleo.api.exception.BadRequestException;
import com.reinasleo.api.service.AdminProductService;
import com.reinasleo.api.service.CollectionService;
import com.reinasleo.api.util.FilenameSanitizer;
import com.reinasleo.api.util.ImageContentValidator;
import com.reinasleo.api.util.ImageNormalizer;
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
import java.util.UUID;

@RestController
@RequestMapping("/api/bot/admin")
public class BotAdminController {

    private final AdminProductService adminProductService;
    private final CollectionService collectionService;

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

    /**
     * Same shrink-and-strip pipeline as the admin upload endpoint
     * ({@link com.reinasleo.api.controller.FileUploadController}): both write
     * into the same {@code uploads/products} directory, served from the same
     * public URL. Type is decided by the actual bytes, not the declared
     * Content-Type, and every accepted file goes through
     * {@link ImageNormalizer} before it touches disk — orientation applied,
     * long side capped at {@link ImageNormalizer#MAX_SIDE}, shooting metadata
     * (including GPS) dropped. WebP is refused outright, same reasoning as
     * the sibling endpoint: rewriting a container we don't fully parse is
     * riskier than rejecting it.
     */
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

        String detectedType;
        try {
            detectedType = ImageContentValidator.detect(file);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to read uploaded file");
        }
        if (detectedType == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only JPG and PNG are supported");
        }
        if ("image/webp".equals(detectedType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "WebP is not supported, please use JPEG or PNG");
        }
        if (!ImageContentValidator.sameFamily(detectedType, file.getContentType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Declared content type does not match the file");
        }

        byte[] source;
        try {
            source = file.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to read uploaded file");
        }

        String originalName = file.getOriginalFilename();
        if (originalName != null && !originalName.isBlank()) {
            FilenameSanitizer.sanitize(originalName);
        }

        ImageNormalizer.Normalized normalized;
        try {
            normalized = ImageNormalizer.normalize(source, detectedType);
        } catch (BadRequestException e) {
            // ImageNormalizer's own messages are Russian, owner-facing text
            // (UploadMessages.*) — this endpoint is read by a bot, not the
            // owner, so it keeps its own English style instead of reusing them.
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to process image");
        }

        try {
            Path uploadPath = Paths.get(uploadDir, "products").toAbsolutePath().normalize();
            Files.createDirectories(uploadPath);

            // Extension comes from what we actually wrote, not the uploaded
            // filename: a .png upload can come back out as .jpg once flattened.
            String filename = UUID.randomUUID() + normalized.extension();
            Path filePath = FilenameSanitizer.resolveInside(uploadPath, filename);
            Files.write(filePath, normalized.bytes());
            return ResponseEntity.ok(Map.of("url", "/uploads/products/" + filename));
        } catch (BadRequestException e) {
            throw e;
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Upload failed");
        }
    }
}
