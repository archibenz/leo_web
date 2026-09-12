package com.reinasleo.api.service.storefront;

import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.ProductModel;
import com.reinasleo.api.model.ProductSet;
import com.reinasleo.api.model.StorefrontSection;
import com.reinasleo.api.repository.ProductModelRepository;
import com.reinasleo.api.repository.ProductRepository;
import com.reinasleo.api.repository.ProductSetRepository;
import com.reinasleo.api.repository.StorefrontSectionRepository;
import com.reinasleo.api.util.FilenameSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collection;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Уборка за отменённой правкой. «Загрузил — передумал — отменил» иначе
 * оставляет файл навсегда, и через год в /uploads лежит в разы больше, чем на
 * витрине.
 *
 * Зовут в трёх местах, и все три — один и тот же вызов: при замене файла в
 * черновике, при отмене черновика, при публикации (старый файл). Список
 * кандидатов — медиа, на которые ссылались ДО правки; после правки каждый
 * кандидат перепроверяется по всей витрине и удаляется, только если на него не
 * ссылается больше никто.
 *
 * Два сознательных ограничения:
 *   • удаляем только то, что лежит под /uploads/ — /videos/ и /images/ это
 *     файлы сборки витрины, они наши только на чтение;
 *   • проверка ссылки — поиск подстроки по колонкам и черновикам. Ошибается
 *     только в сторону «оставить лишний файл», и это правильная сторона:
 *     удалить используемое хуже, чем не удалить брошенное.
 */
@Component
public class StorefrontMediaCleaner {

    private static final Logger log = LoggerFactory.getLogger(StorefrontMediaCleaner.class);
    private static final String PUBLIC_PREFIX = "/uploads/";

    private final ProductModelRepository models;
    private final ProductRepository products;
    private final ProductSetRepository sets;
    private final StorefrontSectionRepository sections;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    public StorefrontMediaCleaner(ProductModelRepository models, ProductRepository products,
                                  ProductSetRepository sets, StorefrontSectionRepository sections) {
        this.models = models;
        this.products = products;
        this.sets = sets;
        this.sections = sections;
    }

    public void forget(Collection<String> candidates) {
        Set<String> ours = candidates.stream()
                .filter(Objects::nonNull)
                .filter(url -> url.startsWith(PUBLIC_PREFIX))
                .collect(Collectors.toSet());
        if (ours.isEmpty()) {
            return;
        }
        String haystack = everythingTheStorefrontStillPointsAt();
        for (String url : ours) {
            if (haystack.contains(url)) {
                continue;
            }
            delete(url);
        }
    }

    private String everythingTheStorefrontStillPointsAt() {
        StringBuilder sb = new StringBuilder();
        for (StorefrontSection s : sections.findAll()) {
            append(sb, s.getVideoUrl(), s.getVideoDesktopUrl(), s.getPosterUrl(), s.getPosterDesktopUrl(), s.getDraft());
        }
        for (ProductModel m : models.findAll()) {
            append(sb, m.getImage(), m.getGallery(), m.getDraft());
        }
        for (Product p : products.findAll()) {
            append(sb, p.getImage(), p.getImages());
        }
        for (ProductSet s : sets.findAll()) {
            append(sb, s.getImage(), s.getDraft());
        }
        return sb.toString();
    }

    private static void append(StringBuilder sb, String... values) {
        for (String v : values) {
            if (v != null) {
                sb.append(v).append('\n');
            }
        }
    }

    private void delete(String url) {
        String relative = url.substring(PUBLIC_PREFIX.length());
        try {
            Path root = Paths.get(uploadDir).toAbsolutePath().normalize();
            Path file = FilenameSanitizer.resolveInside(root, relative);
            if (Files.deleteIfExists(file)) {
                log.info("Storefront media no longer referenced, removed: {}", url);
            }
        } catch (Exception e) {
            // Файл — не источник правды. Не смогли убрать: жалуемся в лог и
            // едем дальше, правка владельца от этого срываться не должна.
            log.warn("Failed to remove unreferenced storefront media {}: {}", url, e.toString());
        }
    }
}
