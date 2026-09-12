package com.reinasleo.api.service.storefront;

import com.reinasleo.api.model.CareGuide;
import com.reinasleo.api.model.Collection;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.ProductModel;
import com.reinasleo.api.model.ProductSet;
import com.reinasleo.api.model.StorefrontSection;
import com.reinasleo.api.repository.CareGuideRepository;
import com.reinasleo.api.repository.CollectionRepository;
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
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Уборка за отменённой правкой. «Загрузил — передумал — отменил» иначе
 * оставляет файл навсегда, и через год в /uploads лежит в разы больше, чем на
 * витрине.
 *
 * СЕМАНТИКА — ПООПЕРАЦИОННАЯ, И ЭТО ГЛАВНОЕ. Удаляется только тот файл,
 * который ЭТА правка сама открепила: кандидатов задаёт вызывающий, и это
 * адреса, на которые ссылалась ИМЕННО ЭТА строка ДО правки. Каталог не
 * обходится никогда: файл, который лежит в /uploads давно и не упомянут ни в
 * одной таблице, кандидатом не станет и удалён не будет. «Подмести всё
 * лишнее в каталоге» этот класс не делает и делать не должен — uploads не
 * бэкапится, бэкап есть только у базы, и удалённый файл не вернуть.
 *
 * Зовут в трёх местах, и все три — один и тот же вызов: при замене файла в
 * черновике, при отмене черновика, при публикации (старый файл).
 *
 * Проверка «на меня больше никто не ссылается» — ПРЕДОХРАНИТЕЛЬ, а не способ
 * искать кандидатов. Она нужна для одного случая: файл прикреплён в двух
 * местах, а открепили его в одном. Поэтому в неё обязаны входить и
 * `collections`, и `care_guides`: старая админка (`ImageUpload.tsx`) грузит
 * обложки коллекций и уходовых карточек в тот же `/uploads/products/`, и один
 * снимок может стоять и на обложке коллекции, и в галерее варианта.
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
    private final CollectionRepository collections;
    private final CareGuideRepository careGuides;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    public StorefrontMediaCleaner(ProductModelRepository models, ProductRepository products,
                                  ProductSetRepository sets, StorefrontSectionRepository sections,
                                  CollectionRepository collections, CareGuideRepository careGuides) {
        this.models = models;
        this.products = products;
        this.sets = sets;
        this.sections = sections;
        this.collections = collections;
        this.careGuides = careGuides;
    }

    /**
     * @param detached адреса, на которые ссылалась правимая строка ДО правки.
     *                 Только они и рассматриваются — ничего другого из каталога
     *                 этот метод удалить не может.
     */
    public void forget(java.util.Collection<String> detached) {
        Set<String> ours = detached.stream()
                .filter(Objects::nonNull)
                .filter(url -> url.startsWith(PUBLIC_PREFIX))
                .collect(Collectors.toSet());
        if (ours.isEmpty()) {
            return;
        }
        String haystack = everythingStillReferenced();
        for (String url : ours) {
            if (haystack.contains(url)) {
                continue;
            }
            delete(url);
        }
    }

    /** Предохранитель: всё, на что витрина и старая админка ещё ссылаются. */
    private String everythingStillReferenced() {
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
        // Старая админка грузит обложки коллекций и уходовых карточек в тот же
        // /uploads/products/. Без этих двух строк общий снимок исчезнет с
        // обложки, как только владелец опубликует правку модели.
        for (Collection c : collections.findAll()) {
            append(sb, c.getImageUrl());
        }
        for (CareGuide g : careGuides.findAll()) {
            append(sb, g.getImage(), g.getCareSymbols());
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
