package com.reinasleo.api.service.storefront;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reinasleo.api.dto.admin.storefront.StorefrontModelRequest;
import com.reinasleo.api.dto.admin.storefront.StorefrontSectionRequest;
import com.reinasleo.api.dto.admin.storefront.StorefrontSetItemRequest;
import com.reinasleo.api.dto.admin.storefront.StorefrontSetRequest;
import com.reinasleo.api.dto.admin.storefront.StorefrontVariantRequest;
import com.reinasleo.api.exception.BadRequestException;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.ProductModel;
import com.reinasleo.api.model.ProductSet;
import com.reinasleo.api.model.ProductSetItem;
import com.reinasleo.api.model.StorefrontSection;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Две половины одного соответствия: проекция опубликованного в тот самый DTO,
 * что приходит в ручку записи, и обратная запись DTO в колонки. Держим их в
 * одном файле нарочно — разъехавшись, они дадут «сохранил одно, увидел
 * другое», а рядом расхождение видно глазами.
 */
@Component
public class StorefrontMapping {

    private static final Logger log = LoggerFactory.getLogger(StorefrontMapping.class);
    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {};
    private static final TypeReference<List<Map<String, String>>> IMAGE_LIST = new TypeReference<>() {};

    private final ObjectMapper json = new ObjectMapper();

    // ----------------------------------------------------------- опубликованное → DTO

    public StorefrontSectionRequest published(StorefrontSection s) {
        return new StorefrontSectionRequest(s.getNameRu(), s.getNameEn(), s.getEyebrowRu(), s.getEyebrowEn(),
                s.getHeadlineRu(), s.getHeadlineEn(), s.getBodyRu(), s.getBodyEn(),
                s.getVideoUrl(), s.getVideoDesktopUrl(), s.getPosterUrl(), s.getPosterDesktopUrl(), s.getSortOrder());
    }

    public StorefrontModelRequest published(ProductModel m, List<Product> variants) {
        Map<String, StorefrontVariantRequest> byId = new LinkedHashMap<>();
        variants.stream()
                .sorted(Comparator.comparingInt(Product::getSortOrder))
                .forEach(v -> byId.put(v.getId(), publishedVariant(v)));
        return new StorefrontModelRequest(m.getNameRu(), m.getNameEn(), m.getCategory(), m.getDescRu(), m.getDescEn(),
                m.getStoryRu(), m.getStoryEn(), m.getCompositionRu(), m.getCompositionEn(), m.getCareRu(), m.getCareEn(),
                m.getSizes() == null ? List.of() : Arrays.asList(m.getSizes()), m.getImage(), readStrings(m.getGallery()),
                m.getSeason(), m.getFeaturedOrder(), m.getLookbookOrder(), m.getSortOrder(), m.isActive(), byId);
    }

    public StorefrontVariantRequest publishedVariant(Product v) {
        return new StorefrontVariantRequest(v.getPrice(), v.getSalePrice(), v.getColorKey(), v.getColorHex(),
                v.getColorNameRu(), v.getColorNameEn(), v.getImage(), readImageSrcs(v.getImages()),
                v.getStockQuantity(), v.isActive(), v.getSortOrder());
    }

    public StorefrontSetRequest published(ProductSet set, List<ProductSetItem> items) {
        return new StorefrontSetRequest(set.getNameRu(), set.getNameEn(), set.getDescRu(), set.getDescEn(),
                set.getImage(), set.getSortOrder(), set.isActive(),
                items.stream()
                        .sorted(Comparator.comparingInt(ProductSetItem::getPosition))
                        .map(i -> new StorefrontSetItemRequest(i.getProductId(), i.getPosition()))
                        .toList());
    }

    // ----------------------------------------------------------- DTO → колонки (факт)

    public void apply(StorefrontSectionRequest r, StorefrontSection s) {
        s.setNameRu(r.nameRu());
        s.setNameEn(r.nameEn());
        s.setEyebrowRu(r.eyebrowRu());
        s.setEyebrowEn(r.eyebrowEn());
        s.setHeadlineRu(r.headlineRu());
        s.setHeadlineEn(r.headlineEn());
        s.setBodyRu(r.bodyRu());
        s.setBodyEn(r.bodyEn());
        s.setVideoUrl(r.videoUrl());
        s.setVideoDesktopUrl(r.videoDesktopUrl());
        s.setPosterUrl(r.posterUrl());
        s.setPosterDesktopUrl(r.posterDesktopUrl());
        s.setSortOrder(r.sortOrder());
    }

    public void apply(StorefrontModelRequest r, ProductModel m, Map<String, Product> variants) {
        m.setNameRu(r.nameRu());
        m.setNameEn(r.nameEn());
        m.setCategory(r.category());
        m.setDescRu(r.descRu());
        m.setDescEn(r.descEn());
        m.setStoryRu(r.storyRu());
        m.setStoryEn(r.storyEn());
        m.setCompositionRu(r.compositionRu());
        m.setCompositionEn(r.compositionEn());
        m.setCareRu(r.careRu());
        m.setCareEn(r.careEn());
        m.setSizes(r.sizes().toArray(String[]::new));
        m.setImage(r.image());
        m.setGallery(writeJson(r.gallery()));
        m.setSeason(r.season());
        m.setFeaturedOrder(r.featuredOrder());
        m.setLookbookOrder(r.lookbookOrder());
        m.setSortOrder(r.sortOrder());
        m.setActive(r.active());

        for (Map.Entry<String, StorefrontVariantRequest> e : r.variants().entrySet()) {
            Product v = variants.get(e.getKey());
            if (v == null) {
                // Черновик назвал вариант, которого нет. Молча пропустить — значит
                // показать владельцу правку, которая никогда не доедет до витрины.
                throw new BadRequestException("unknown_variant:" + e.getKey());
            }
            applyVariant(e.getValue(), v);
        }
    }

    public void applyVariant(StorefrontVariantRequest r, Product v) {
        v.setPrice(r.price());
        v.setSalePrice(r.salePrice());
        v.setColorKey(r.colorKey());
        v.setColorHex(r.colorHex());
        v.setColorNameRu(r.colorNameRu());
        v.setColorNameEn(r.colorNameEn());
        v.setImage(r.image());
        v.setImages(writeVariantGallery(r.gallery()));
        v.setStockQuantity(r.stockQuantity());
        v.setActive(r.active());
        v.setSortOrder(r.sortOrder());
    }

    public void apply(StorefrontSetRequest r, ProductSet set) {
        set.setNameRu(r.nameRu());
        set.setNameEn(r.nameEn());
        set.setDescRu(r.descRu());
        set.setDescEn(r.descEn());
        set.setImage(r.image());
        set.setSortOrder(r.sortOrder());
        set.setActive(r.active());
    }

    /** Состав образа из DTO в строки — их же кладёт публикация и показывает предпросмотр. */
    public List<ProductSetItem> itemsOf(UUID setId, StorefrontSetRequest r) {
        List<ProductSetItem> items = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        for (StorefrontSetItemRequest i : r.items()) {
            if (!seen.add(i.productId())) {
                // UNIQUE (set_id, product_id) из V29 — ловим до записи, чтобы
                // владелец получил понятный отказ, а не 409 из драйвера.
                throw new BadRequestException("duplicate_set_item:" + i.productId());
            }
            ProductSetItem item = new ProductSetItem();
            item.setSetId(setId);
            item.setProductId(i.productId());
            item.setPosition(i.position());
            items.add(item);
        }
        return items;
    }

    // ----------------------------------------------------------- медиа, на которые ссылается DTO

    public Set<String> media(StorefrontSectionRequest r) {
        return nonNull(r.videoUrl(), r.videoDesktopUrl(), r.posterUrl(), r.posterDesktopUrl());
    }

    public Set<String> media(StorefrontModelRequest r) {
        Set<String> urls = new LinkedHashSet<>(nonNull(r.image()));
        if (r.gallery() != null) {
            r.gallery().stream().filter(Objects::nonNull).forEach(urls::add);
        }
        for (StorefrontVariantRequest v : r.variants().values()) {
            urls.addAll(media(v));
        }
        return urls;
    }

    public Set<String> media(StorefrontVariantRequest r) {
        Set<String> urls = new LinkedHashSet<>(nonNull(r.image()));
        if (r.gallery() != null) {
            r.gallery().stream().filter(Objects::nonNull).forEach(urls::add);
        }
        return urls;
    }

    public Set<String> media(StorefrontSetRequest r) {
        return nonNull(r.image());
    }

    private static Set<String> nonNull(String... values) {
        Set<String> urls = new LinkedHashSet<>();
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                urls.add(v);
            }
        }
        return urls;
    }

    // ----------------------------------------------------------- JSONB

    private List<String> readStrings(String jsonArray) {
        try {
            return jsonArray == null ? List.of() : json.readValue(jsonArray, STRING_LIST);
        } catch (Exception e) {
            log.error("Failed to parse model gallery JSON; returning empty gallery", e);
            return List.of();
        }
    }

    private List<String> readImageSrcs(String jsonArray) {
        try {
            return jsonArray == null ? List.of() : json.readValue(jsonArray, IMAGE_LIST).stream()
                    .map(o -> o.get("src"))
                    .filter(Objects::nonNull)
                    .toList();
        } catch (Exception e) {
            log.error("Failed to parse variant images JSON; returning empty gallery", e);
            return List.of();
        }
    }

    private String writeJson(List<String> values) {
        try {
            return json.writeValueAsString(values == null ? List.of() : values);
        } catch (Exception e) {
            throw new BadRequestException("gallery_is_not_serialisable");
        }
    }

    // Галерея варианта хранится как [{src, alt}] — форму задала админка, витрина
    // читает из неё src. Пишем в той же форме, иначе старый экран ослепнет.
    private String writeVariantGallery(List<String> srcs) {
        List<Map<String, String>> images = (srcs == null ? List.<String>of() : srcs).stream()
                .filter(Objects::nonNull)
                .map(src -> Map.of("src", src, "alt", ""))
                .toList();
        try {
            return json.writeValueAsString(images);
        } catch (Exception e) {
            throw new BadRequestException("gallery_is_not_serialisable");
        }
    }
}
