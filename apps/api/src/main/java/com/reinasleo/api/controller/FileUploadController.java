package com.reinasleo.api.controller;

import com.reinasleo.api.exception.BadRequestException;
import com.reinasleo.api.util.FilenameSanitizer;
import com.reinasleo.api.util.ImageContentValidator;
import com.reinasleo.api.util.ImageNormalizer;
import com.reinasleo.api.util.UploadMessages;
import com.reinasleo.api.util.VideoContentValidator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/upload")
public class FileUploadController {

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/jpg"
    );
    // Снимок с айфона весит 5–12 МБ, и прежние 10 МБ отбивали его на первой же
    // попытке. Предел поднят — но строго В ПАРЕ с уменьшением: принимаем тяжёлое,
    // на витрину кладём лёгкое. Поднять предел без уменьшения значило бы
    // перенести боль с владельца на покупателя, которому этот кадр поехал бы
    // в галерею товара.
    private static final long MAX_IMAGE_SIZE = 32L * 1024 * 1024;

    // WebP в этой JVM раскодировать нечем (ImageIO не знает его формата), значит
    // нечем и уменьшить. Такой файл проходит как есть — и поэтому остаётся на
    // прежнем пороге в 10 МБ: поднимать предел там, где мы не жмём, запрещено.
    private static final long MAX_PASSTHROUGH_SIZE = 10L * 1024 * 1024;

    // ffmpeg на сервере нет, и ставить его — решение владельца, а не конфиг.
    // Значит сервер не сжимает, а отказывает: нынешние ролики витрины весят
    // 1.6–2.7 МБ, восьми мегабайт хватает с запасом, а исходник с телефона или
    // из генератора (50–200 МБ) едет в телеграм и возвращается готовым.
    // Потолок тела запроса (64 МБ) нарочно выше этого порога: тогда отказ
    // приходит отсюда понятным текстом, а не от nginx или Tomcat.
    private static final Set<String> ALLOWED_VIDEO_TYPES = Set.of("video/mp4", "video/webm");
    private static final long MAX_VIDEO_SIZE = 8 * 1024 * 1024;
    private static final String TELEGRAM_HINT = UploadMessages.TELEGRAM_HINT;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    /**
     * Картинка витрины. Принимается тяжёлый снимок с телефона, кладётся лёгкий
     * кадр: поворот по EXIF, длинная сторона до 2000 px, JPEG q82, метаданные
     * съёмки (включая координаты) выброшены. Подробности порядка шагов — в
     * {@link ImageNormalizer}.
     */
    @PostMapping
    public ResponseEntity<Map<String, String>> upload(@RequestParam("file") MultipartFile file) {

        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Файл пустой");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, UploadMessages.NOT_AN_IMAGE);
        }

        boolean shrinkable = !"image/webp".equals(contentType);
        long ceiling = shrinkable ? MAX_IMAGE_SIZE : MAX_PASSTHROUGH_SIZE;
        if (file.getSize() > ceiling) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    shrinkable ? UploadMessages.IMAGE_TOO_LARGE : UploadMessages.WEBP_NOT_RESIZED);
        }

        try {
            if (!ImageContentValidator.isSupportedImage(file)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, UploadMessages.UNREADABLE_IMAGE);
            }
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Не удалось прочитать загруженный файл");
        }

        // Имя проверяется ДО разбора картинки: отказать на обходе каталога
        // дешевле, чем сначала раскодировать тридцать мегабайт. На диск оно
        // всё равно не попадает — файл ложится под UUID.
        String originalName = file.getOriginalFilename();
        if (originalName != null && !originalName.isBlank()) {
            FilenameSanitizer.sanitize(originalName);
        }

        byte[] source;
        try {
            source = file.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Не удалось прочитать загруженный файл");
        }

        byte[] bytes;
        String extension;
        if (shrinkable) {
            ImageNormalizer.Normalized normalized = ImageNormalizer.normalize(source, contentType);
            bytes = normalized.bytes();
            // Расширение берётся из того, что мы РЕАЛЬНО записали, а не из имени
            // загрузки: png на входе мог уехать в jpg, и .png на диске отдавался
            // бы с чужим Content-Type.
            extension = normalized.extension();
        } else {
            bytes = source;
            extension = ".webp";
        }

        try {
            Path uploadPath = Paths.get(uploadDir, "products").toAbsolutePath().normalize();
            Files.createDirectories(uploadPath);

            String filename = UUID.randomUUID() + extension;
            Path filePath = FilenameSanitizer.resolveInside(uploadPath, filename);
            Files.write(filePath, bytes);

            return ResponseEntity.ok(Map.of("url", "/uploads/products/" + filename));

        } catch (BadRequestException e) {
            throw e;
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to save file");
        }
    }

    /**
     * Видео витрины. Имя файла — SHA-256 содержимого: nginx отдаёт /uploads/ с
     * expires 7d, и без хэша покупатель неделю смотрел бы старый ролик. Побочно
     * это же решает повтор: одно содержимое — один файл, сколько его ни грузи.
     */
    @PostMapping("/video")
    public ResponseEntity<Map<String, String>> uploadVideo(@RequestParam("file") MultipartFile file) {

        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Файл пустой");
        }

        if (file.getSize() > MAX_VIDEO_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ролик тяжелее 8 МБ, а сжимать на сервере нечем. " + TELEGRAM_HINT);
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_VIDEO_TYPES.contains(contentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "На витрину идут только MP4 (H.264) и WebM (VP8/VP9).");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Не удалось прочитать загруженный файл");
        }

        VideoContentValidator.Probe probe = VideoContentValidator.probe(bytes);
        if (probe.container() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Содержимое файла не похоже ни на MP4, ни на WebM.");
        }
        if (!probe.webReady()) {
            String codec = probe.codec() == null ? "кодек не читается" : "кодек " + probe.codec();
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "У ролика " + codec + " — такой покажут не все браузеры. " + TELEGRAM_HINT);
        }

        String filename = sha256(bytes) + ("mp4".equals(probe.container()) ? ".mp4" : ".webm");
        try {
            Path uploadPath = Paths.get(uploadDir, "video").toAbsolutePath().normalize();
            Files.createDirectories(uploadPath);
            Path filePath = FilenameSanitizer.resolveInside(uploadPath, filename);
            if (!Files.exists(filePath)) {
                Files.write(filePath, bytes);
            }
            return ResponseEntity.ok(Map.of("url", "/uploads/video/" + filename));
        } catch (BadRequestException e) {
            throw e;
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to save file");
        }
    }

    private static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to hash file");
        }
    }
}
