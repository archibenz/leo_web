package com.reinasleo.api.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reinasleo.api.dto.storefront.StorefrontColour;
import com.reinasleo.api.dto.storefront.StorefrontProduct;
import com.reinasleo.api.dto.storefront.StorefrontResponse;
import com.reinasleo.api.dto.storefront.StorefrontSectionDto;
import com.reinasleo.api.dto.storefront.StorefrontSet;
import com.reinasleo.api.dto.storefront.StorefrontSetItem;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.ProductModel;
import com.reinasleo.api.model.ProductSetItem;
import com.reinasleo.api.model.StorefrontSection;
import com.reinasleo.api.repository.ProductModelRepository;
import com.reinasleo.api.repository.ProductRepository;
import com.reinasleo.api.repository.ProductSetItemRepository;
import com.reinasleo.api.repository.ProductSetRepository;
import com.reinasleo.api.repository.StorefrontSectionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class StorefrontService {

    private static final Logger log = LoggerFactory.getLogger(StorefrontService.class);

    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {};
    private static final TypeReference<List<Map<String, String>>> IMAGE_LIST = new TypeReference<>() {};

    private final ObjectMapper json = new ObjectMapper();

    private final ProductModelRepository models;
    private final ProductRepository products;
    private final ProductSetRepository sets;
    private final ProductSetItemRepository setItems;
    private final StorefrontSectionRepository sections;

    public StorefrontService(ProductModelRepository models, ProductRepository products, ProductSetRepository sets,
                             ProductSetItemRepository setItems, StorefrontSectionRepository sections) {
        this.models = models;
        this.products = products;
        this.sets = sets;
        this.setItems = setItems;
        this.sections = sections;
    }

    @Cacheable("storefront")
    @Transactional(readOnly = true)
    public StorefrontResponse getStorefront() {
        // Цвета внутри модели идут по sort_order — витрина показывает первым тот, чью цену видит покупатель.
        Map<UUID, List<Product>> variantsByModel = products.findByModelIdIsNotNullAndActiveTrueOrderByModelIdAscSortOrderAsc()
                .stream()
                .sorted(Comparator.comparingInt(Product::getSortOrder))
                .collect(Collectors.groupingBy(Product::getModelId, LinkedHashMap::new, Collectors.toList()));

        List<StorefrontProduct> productDtos = models.findByActiveTrueOrderBySortOrderAsc().stream()
                .map(m -> toProduct(m, variantsByModel.getOrDefault(m.getId(), List.of())))
                .filter(p -> !p.colors().isEmpty())
                .toList();

        Map<String, StorefrontProduct> productByVariantId = new HashMap<>();
        for (StorefrontProduct p : productDtos) {
            for (StorefrontColour c : p.colors()) {
                productByVariantId.put(c.id(), p);
            }
        }

        Map<UUID, List<ProductSetItem>> itemsBySet = setItems.findAllByOrderBySetIdAscPositionAsc().stream()
                .collect(Collectors.groupingBy(ProductSetItem::getSetId, LinkedHashMap::new, Collectors.toList()));
        List<StorefrontSet> setDtos = sets.findByActiveTrueOrderBySortOrderAsc().stream()
                .map(s -> new StorefrontSet(s.getKey(), s.getNameEn(), s.getNameRu(), s.getDescEn(), s.getDescRu(), s.getImage(),
                        itemsBySet.getOrDefault(s.getId(), List.of()).stream()
                                .map(it -> toSetItem(it, productByVariantId))
                                .filter(Objects::nonNull)
                                .toList()))
                .toList();

        List<StorefrontSectionDto> sectionDtos = sections.findByStatusOrderBySortOrderAsc("active").stream()
                .map(this::toSection).toList();

        return new StorefrontResponse(productDtos, setDtos, sectionDtos);
    }

    private StorefrontProduct toProduct(ProductModel m, List<Product> variants) {
        List<StorefrontColour> colours = variants.stream().map(this::toColour).toList();
        Product first = variants.isEmpty() ? null : variants.get(0);
        return new StorefrontProduct(
                m.getId().toString(), m.getModelKey(), m.getSlug(), m.getNameEn(), m.getNameRu(), m.getCategory(),
                first == null ? null : first.getPrice(), first == null ? null : first.getSalePrice(),
                m.getDescEn(), m.getDescRu(), m.getStoryEn(), m.getStoryRu(),
                m.getCompositionEn(), m.getCompositionRu(), m.getCareEn(), m.getCareRu(),
                colours, Arrays.asList(m.getSizes()), m.getImage(), readStrings(m.getGallery()),
                first == null ? null : first.getNm(), m.getSeason(), m.getFeaturedOrder(), m.getLookbookOrder());
    }

    private StorefrontColour toColour(Product v) {
        return new StorefrontColour(v.getId(), v.getColorKey(), v.getColorHex(), v.getColorNameEn(), v.getColorNameRu(),
                v.getNm(), v.getPrice(), v.getSalePrice(), v.getImage(), readImageSrcs(v.getImages()));
    }

    private StorefrontSetItem toSetItem(ProductSetItem it, Map<String, StorefrontProduct> byVariant) {
        StorefrontProduct p = byVariant.get(it.getProductId());
        if (p == null) {
            return null;
        }
        String colourKey = p.colors().stream()
                .filter(c -> c.id().equals(it.getProductId()))
                .findFirst()
                .map(StorefrontColour::key)
                .orElse(null);
        return new StorefrontSetItem(it.getProductId(), p.key(), colourKey);
    }

    private StorefrontSectionDto toSection(StorefrontSection s) {
        return new StorefrontSectionDto(s.getId().toString(), s.getSlug(), s.getLayout(), s.getStatus(),
                s.getNameRu(), s.getNameEn(), s.getEyebrowRu(), s.getEyebrowEn(),
                s.getHeadlineRu(), s.getHeadlineEn(), s.getBodyRu(), s.getBodyEn(),
                s.getVideoUrl(), s.getVideoDesktopUrl(), s.getPosterUrl(), s.getPosterDesktopUrl(), s.getSortOrder());
    }

    // Модельная галерея хранится как ["/a.jpg", ...], галерея варианта — как [{src, alt}] из админки.
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
}
