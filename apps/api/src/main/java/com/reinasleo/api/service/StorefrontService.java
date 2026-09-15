package com.reinasleo.api.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reinasleo.api.dto.storefront.StorefrontBrokenDraft;
import com.reinasleo.api.dto.storefront.StorefrontColour;
import com.reinasleo.api.dto.storefront.StorefrontProduct;
import com.reinasleo.api.dto.storefront.StorefrontResponse;
import com.reinasleo.api.dto.storefront.StorefrontSectionDto;
import com.reinasleo.api.dto.storefront.StorefrontSet;
import com.reinasleo.api.dto.storefront.StorefrontSetItem;
import com.reinasleo.api.dto.storefront.TickerItemDto;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.ProductModel;
import com.reinasleo.api.model.ProductSet;
import com.reinasleo.api.model.ProductSetItem;
import com.reinasleo.api.model.StorefrontSection;
import com.reinasleo.api.repository.MarketplacePriceRepository;
import com.reinasleo.api.repository.ProductModelRepository;
import com.reinasleo.api.repository.ProductRepository;
import com.reinasleo.api.repository.ProductSetItemRepository;
import com.reinasleo.api.repository.ProductSetRepository;
import com.reinasleo.api.repository.StorefrontSectionRepository;
import com.reinasleo.api.service.storefront.MarketplacePriceLookup;
import com.reinasleo.api.service.storefront.StorefrontDraftMerge;
import com.reinasleo.api.service.storefront.StorefrontMapping;
import com.reinasleo.api.service.storefront.VariantPrice;
import com.reinasleo.api.service.storefront.VariantPriceCalculator;
import com.reinasleo.api.dto.admin.storefront.StorefrontModelRequest;
import com.reinasleo.api.dto.admin.storefront.StorefrontSectionRequest;
import com.reinasleo.api.dto.admin.storefront.StorefrontSetRequest;
import jakarta.persistence.EntityManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
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
    private static final TypeReference<List<TickerItemDto>> TICKER_ITEM_LIST = new TypeReference<>() {};

    private final ObjectMapper json = new ObjectMapper();

    private final ProductModelRepository models;
    private final ProductRepository products;
    private final ProductSetRepository sets;
    private final ProductSetItemRepository setItems;
    private final StorefrontSectionRepository sections;
    private final MarketplacePriceRepository marketplacePrices;
    private final StorefrontMapping mapping;
    private final VariantPriceCalculator priceCalculator;
    private final EntityManager entityManager;

    public StorefrontService(ProductModelRepository models, ProductRepository products, ProductSetRepository sets,
                             ProductSetItemRepository setItems, StorefrontSectionRepository sections,
                             MarketplacePriceRepository marketplacePrices, StorefrontMapping mapping,
                             VariantPriceCalculator priceCalculator, EntityManager entityManager) {
        this.models = models;
        this.products = products;
        this.sets = sets;
        this.setItems = setItems;
        this.sections = sections;
        this.marketplacePrices = marketplacePrices;
        this.mapping = mapping;
        this.priceCalculator = priceCalculator;
        this.entityManager = entityManager;
    }

    @Cacheable("storefront")
    @Transactional(readOnly = true)
    public StorefrontResponse getStorefront() {
        return build(false);
    }

    /**
     * Витрина глазами владельца: опубликованное, поверх которого лёг черновик.
     *
     * НЕ кэшируется — ни Caffeine, ни снимком. Черновик это намерение, и
     * показывать его протухшим нельзя: увидев старое, владелец либо решит, что
     * правка потерялась, и сделает её заново, либо, хуже, решит, что она
     * применилась, и нажмёт «Опубликовать» вслепую.
     *
     * Черновик накладывается ТОЙ ЖЕ функцией слияния и ТЕМ ЖЕ применением DTO к
     * полям, которыми пользуется публикация, — иначе предпросмотр показал бы
     * одно, а публикация сделала другое.
     */
    @Transactional(readOnly = true)
    public StorefrontResponse getStorefrontDraft() {
        return build(true);
    }

    private StorefrontResponse build(boolean withDrafts) {
        List<Product> variantRows = withDrafts
                ? products.findByModelIdIsNotNullOrderByModelIdAscSortOrderAsc()
                : products.findByModelIdIsNotNullAndActiveTrueOrderByModelIdAscSortOrderAsc();
        List<ProductModel> modelRows = withDrafts
                ? models.findAllByOrderBySortOrderAsc()
                : models.findByActiveTrueOrderBySortOrderAsc();
        List<ProductSet> setRows = withDrafts
                ? sets.findAllByOrderBySortOrderAsc()
                : sets.findByActiveTrueOrderBySortOrderAsc();
        List<StorefrontSection> sectionRows = withDrafts
                ? sections.findByStatusInOrderBySortOrderAsc(List.of("active", "draft"))
                : sections.findByStatusOrderBySortOrderAsc("active");

        // Цвета внутри модели идут по sort_order — витрина показывает первым тот, чью цену видит покупатель.
        Map<UUID, List<Product>> variantsByModel = variantRows.stream()
                .sorted(Comparator.comparingInt(Product::getSortOrder))
                .collect(Collectors.groupingBy(Product::getModelId, LinkedHashMap::new, Collectors.toList()));

        // Один запрос под цены ВСЕХ вариантов этого построения — см.
        // MarketplacePriceLookup про то, почему не по одному варианту за раз.
        // Черновик её не трогает (marketplace_prices вне драфтов), поэтому
        // один и тот же срез годится и для applyDrafts, и для toProduct ниже.
        MarketplacePriceLookup prices = variantRows.isEmpty()
                ? MarketplacePriceLookup.empty()
                : MarketplacePriceLookup.from(marketplacePrices.findByProductIdIn(
                        variantRows.stream().map(Product::getId).toList()));

        Map<UUID, List<ProductSetItem>> itemsBySet = setItems.findAllByOrderBySetIdAscPositionAsc().stream()
                .collect(Collectors.groupingBy(ProductSetItem::getSetId, LinkedHashMap::new, Collectors.toList()));

        List<StorefrontBrokenDraft> brokenDrafts = withDrafts
                ? applyDrafts(modelRows, variantsByModel, setRows, itemsBySet, sectionRows, prices)
                : null;

        List<StorefrontProduct> productDtos = modelRows.stream()
                .filter(ProductModel::isActive)
                .map(m -> toProduct(m, variantsByModel.getOrDefault(m.getId(), List.of()).stream()
                        .filter(Product::isActive)
                        .sorted(Comparator.comparingInt(Product::getSortOrder))
                        .toList(), prices))
                .filter(p -> !p.colors().isEmpty())
                .toList();

        Map<String, StorefrontProduct> productByVariantId = new HashMap<>();
        for (StorefrontProduct p : productDtos) {
            for (StorefrontColour c : p.colors()) {
                productByVariantId.put(c.id(), p);
            }
        }

        List<StorefrontSet> setDtos = setRows.stream()
                .filter(ProductSet::isActive)
                .map(s -> new StorefrontSet(s.getKey(), s.getNameEn(), s.getNameRu(), s.getDescEn(), s.getDescRu(), s.getImage(),
                        itemsBySet.getOrDefault(s.getId(), List.of()).stream()
                                .map(it -> toSetItem(it, productByVariantId))
                                .filter(Objects::nonNull)
                                .toList()))
                .toList();

        List<StorefrontSectionDto> sectionDtos = sectionRows.stream().map(this::toSection).toList();

        return new StorefrontResponse(productDtos, setDtos, sectionDtos, brokenDrafts);
    }

    /**
     * Черновик поверх опубликованного — на отсоединённых от сессии строках,
     * чтобы предпросмотр физически не мог ничего записать в базу.
     *
     * ПОСТРОЧНО, И ЭТО ГЛАВНОЕ (lw-sjek). Нечитаемый черновик одной карточки
     * раньше уносил весь предпросмотр в 400: владелец не видел ни одной своей
     * правки, включая исправные, и не понимал, какая из них виновата. Теперь
     * сломанная строка возвращается в ОПУБЛИКОВАННЫЙ вид (тем же применением
     * DTO к полям, которым правка и накладывалась), а рядом кладётся маркер.
     *
     * Маркер обязателен: «правки нет» и «правка есть, но её не прочитать» —
     * разные вещи, и молча показать первое вместо второго значит заставить
     * владельца сделать правку заново поверх той, что уже лежит в базе.
     *
     * Показать сломанное можно, опубликовать — нет: публикация зовёт ту же
     * функцию слияния без этого перехвата и отвечает 400.
     */
    private List<StorefrontBrokenDraft> applyDrafts(List<ProductModel> modelRows, Map<UUID, List<Product>> variantsByModel,
                                                    List<ProductSet> setRows, Map<UUID, List<ProductSetItem>> itemsBySet,
                                                    List<StorefrontSection> sectionRows, MarketplacePriceLookup prices) {
        List<StorefrontBrokenDraft> broken = new ArrayList<>();
        for (StorefrontSection s : sectionRows) {
            entityManager.detach(s);
            if (s.getDraft() == null) {
                continue;
            }
            StorefrontSectionRequest published = mapping.published(s);
            try {
                StorefrontSectionRequest merged = StorefrontDraftMerge.merge(
                        published, s.getDraft(), StorefrontSectionRequest.class);
                mapping.apply(merged, s);
            } catch (RuntimeException e) {
                broken.add(unreadable("section", s.getId().toString(), s.getSlug(), e));
                restore(() -> mapping.apply(published, s), "section", s.getSlug());
            }
        }
        for (ProductModel m : modelRows) {
            entityManager.detach(m);
            List<Product> variants = variantsByModel.getOrDefault(m.getId(), List.of());
            variants.forEach(entityManager::detach);
            if (m.getDraft() == null) {
                continue;
            }
            Map<String, Product> variantsById = variants.stream()
                    .collect(Collectors.toMap(Product::getId, java.util.function.Function.identity()));
            StorefrontModelRequest published = mapping.published(m, variants, prices);
            try {
                StorefrontModelRequest merged = StorefrontDraftMerge.merge(
                        published, m.getDraft(), StorefrontModelRequest.class);
                mapping.apply(merged, m, variantsById);
            } catch (RuntimeException e) {
                broken.add(unreadable("model", m.getId().toString(), m.getSlug(), e));
                // Применение могло успеть тронуть часть полей и часть вариантов
                // до отказа — возвращаем всю карточку целиком, а не то, что
                // «кажется» изменившимся.
                restore(() -> mapping.apply(published, m, variantsById), "model", m.getSlug());
            }
        }
        for (ProductSet set : setRows) {
            entityManager.detach(set);
            if (set.getDraft() == null) {
                continue;
            }
            StorefrontSetRequest published = mapping.published(set, itemsBySet.getOrDefault(set.getId(), List.of()));
            try {
                StorefrontSetRequest merged = StorefrontDraftMerge.merge(
                        published, set.getDraft(), StorefrontSetRequest.class);
                mapping.apply(merged, set);
                // Состав подменяется последним: он заменяет опубликованные
                // строки, и делать это до успешного слияния значило бы оставить
                // сломанный образ с чужим составом.
                itemsBySet.put(set.getId(), mapping.itemsOf(set.getId(), merged));
            } catch (RuntimeException e) {
                broken.add(unreadable("set", set.getId().toString(), set.getKey(), e));
                restore(() -> mapping.apply(published, set), "set", set.getKey());
            }
        }
        return broken;
    }

    private StorefrontBrokenDraft unreadable(String kind, String id, String key, RuntimeException e) {
        String reason = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
        log.warn("Draft of {} {} is unreadable; serving the published row instead: {}", kind, key, reason);
        return new StorefrontBrokenDraft(kind, id, key, reason);
    }

    // Возврат строки в опубликованный вид. Своё исключение здесь означало бы,
    // что опубликованные колонки сами себя не переживают, — такое надо видеть
    // в логе, но валить из-за него весь предпросмотр нельзя.
    private void restore(Runnable restore, String kind, String key) {
        try {
            restore.run();
        } catch (RuntimeException e) {
            log.error("Could not restore the published state of {} {}", kind, key, e);
        }
    }

    private StorefrontProduct toProduct(ProductModel m, List<Product> variants, MarketplacePriceLookup prices) {
        List<StorefrontColour> colours = variants.stream().map(v -> toColour(v, prices)).toList();
        Product first = variants.isEmpty() ? null : variants.get(0);
        // Цена карточки — цена ПЕРВОГО цвета, уже посчитанная в colours: своего
        // вычисления здесь нет нарочно, иначе VariantPriceCalculator.compute
        // для первого варианта звался бы дважды с одним и тем же результатом.
        StorefrontColour firstColour = colours.isEmpty() ? null : colours.get(0);
        return new StorefrontProduct(
                m.getId().toString(), m.getModelKey(), m.getSlug(), m.getNameEn(), m.getNameRu(), m.getCategory(),
                firstColour == null ? null : firstColour.price(), firstColour == null ? null : firstColour.sale(),
                m.getDescEn(), m.getDescRu(), m.getStoryEn(), m.getStoryRu(),
                m.getCompositionEn(), m.getCompositionRu(), m.getCareEn(), m.getCareRu(),
                colours, Arrays.asList(m.getSizes()), m.getImage(), readStrings(m.getGallery()),
                modelNm(m, first), m.getSeason(), m.getFeaturedOrder(), m.getLookbookOrder());
    }

    // Артикул модели — свой, если он задан: у модели и у её первого цвета карточки
    // WB могут быть разные, и от этого зависят соответствие сток-снимку, кнопка
    // «купить на WB» и sku/mpn в JSON-LD. Без своего берём первый вариант.
    private Long modelNm(ProductModel m, Product first) {
        if (m.getNm() != null) {
            return m.getNm();
        }
        return first == null ? null : first.getNm();
    }

    // price/sale — НЕ прямое чтение v.getPrice()/v.getSalePrice(): с V36 это
    // основа и действующая цена из VariantPriceCalculator (price_source,
    // discount_pct, порог по себестоимости). Флаги калькулятора сюда не идут
    // намеренно — покупателю про источник цены и себестоимость знать нечего,
    // это дело только админского StorefrontVariantRequest.
    private StorefrontColour toColour(Product v, MarketplacePriceLookup prices) {
        VariantPrice price = priceCalculator.compute(v, prices);
        return new StorefrontColour(v.getId(), v.getColorKey(), v.getColorHex(), v.getColorNameEn(), v.getColorNameRu(),
                v.getNm(), price.basePrice(), price.salePrice(), v.getImage(), readImageSrcs(v.getImages()));
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
                s.getVideoUrl(), s.getVideoDesktopUrl(), s.getPosterUrl(), s.getPosterDesktopUrl(), s.getSortOrder(),
                readTickerItems(s.getItems()));
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

    // Языком (en/ru) и датой (until) владеет фронтенд (lib/catalogue/select.ts) —
    // сервер отдаёт строки как лежат, не решая, кому что показывать.
    private List<TickerItemDto> readTickerItems(String jsonArray) {
        try {
            return jsonArray == null ? List.of() : json.readValue(jsonArray, TICKER_ITEM_LIST);
        } catch (Exception e) {
            log.error("Failed to parse ticker items JSON; returning an empty ticker", e);
            return List.of();
        }
    }
}
