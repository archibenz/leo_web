package com.reinasleo.api.service.storefront;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.reinasleo.api.dto.admin.storefront.StorefrontDraftSummary;
import com.reinasleo.api.dto.admin.storefront.StorefrontModelRequest;
import com.reinasleo.api.dto.admin.storefront.StorefrontSectionRequest;
import com.reinasleo.api.dto.admin.storefront.StorefrontSetItemRequest;
import com.reinasleo.api.dto.admin.storefront.StorefrontSetRequest;
import com.reinasleo.api.exception.BadRequestException;
import com.reinasleo.api.exception.NotFoundException;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.ProductModel;
import com.reinasleo.api.model.ProductSet;
import com.reinasleo.api.model.StorefrontSection;
import com.reinasleo.api.repository.ProductModelRepository;
import com.reinasleo.api.repository.ProductRepository;
import com.reinasleo.api.repository.ProductSetItemRepository;
import com.reinasleo.api.repository.ProductSetRepository;
import com.reinasleo.api.repository.StorefrontSectionRepository;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Запись витрины. Правка уходит в черновик (`draft JSONB`), публикация
 * переносит её в колонки и черновик очищает.
 *
 * Черновик и публикация ходят одной дорогой: обе собирают из черновика ТОТ ЖЕ
 * DTO, что приходит в ручку записи (через {@link StorefrontDraftMerge#merge}),
 * и прогоняют через него ТЕ ЖЕ правила валидации. «Слить и сохранить» вслепую
 * запрещено: JSONB не проверяет ничего, и опечатка иначе доедет до витрины.
 *
 * Кэши здесь НЕ сбрасываются: сброс внутри транзакции лёг бы до коммита, и
 * параллельный публичный запрос перезалил бы в Caffeine докоммитные данные на
 * пять минут. Этим занимается контроллер после возврата — см. StorefrontCaches.
 */
@Service
public class StorefrontAdminService {

    private final ProductModelRepository models;
    private final ProductRepository products;
    private final ProductSetRepository sets;
    private final ProductSetItemRepository setItems;
    private final StorefrontSectionRepository sections;
    private final StorefrontMapping mapping;
    private final StorefrontMediaCleaner mediaCleaner;
    private final Validator validator;

    public StorefrontAdminService(ProductModelRepository models, ProductRepository products, ProductSetRepository sets,
                                  ProductSetItemRepository setItems, StorefrontSectionRepository sections,
                                  StorefrontMapping mapping, StorefrontMediaCleaner mediaCleaner, Validator validator) {
        this.models = models;
        this.products = products;
        this.sets = sets;
        this.setItems = setItems;
        this.sections = sections;
        this.mapping = mapping;
        this.mediaCleaner = mediaCleaner;
        this.validator = validator;
    }

    // =========================================================== блоки витрины

    @Transactional
    public StorefrontSectionRequest saveSectionDraft(UUID id, String patchJson) {
        StorefrontSection section = section(id);
        StorefrontSectionRequest published = mapping.published(section);
        Set<String> before = mediaOfCurrentDraft(published, section.getDraft(), StorefrontSectionRequest.class,
                mapping::media);

        ObjectNode accumulated = StorefrontDraftMerge.accumulate(section.getDraft(),
                StorefrontDraftMerge.readPatch(patchJson));
        StorefrontSectionRequest merged = validated(
                StorefrontDraftMerge.merge(published, accumulated.toString(), StorefrontSectionRequest.class));

        section.setDraft(accumulated.toString());
        sections.saveAndFlush(section);
        mediaCleaner.forget(before);
        return merged;
    }

    @Transactional
    public StorefrontSectionRequest publishSection(UUID id) {
        StorefrontSection section = section(id);
        StorefrontSectionRequest published = mapping.published(section);
        if (section.getDraft() == null) {
            return published;
        }
        StorefrontSectionRequest merged = validated(
                StorefrontDraftMerge.merge(published, section.getDraft(), StorefrontSectionRequest.class));

        Set<String> replaced = mapping.media(published);
        mapping.apply(merged, section);
        section.setDraft(null);
        sections.saveAndFlush(section);
        mediaCleaner.forget(replaced);
        return merged;
    }

    @Transactional
    public StorefrontSectionRequest discardSectionDraft(UUID id) {
        StorefrontSection section = section(id);
        StorefrontSectionRequest published = mapping.published(section);
        Set<String> abandoned = mediaOfCurrentDraft(published, section.getDraft(), StorefrontSectionRequest.class,
                mapping::media);

        section.setDraft(null);
        sections.saveAndFlush(section);
        mediaCleaner.forget(abandoned);
        return published;
    }

    // =========================================================== модели и их варианты

    @Transactional
    public StorefrontModelRequest saveModelDraft(UUID id, String patchJson) {
        ProductModel model = model(id);
        List<Product> variants = products.findByModelIdOrderBySortOrderAsc(id);
        StorefrontModelRequest published = mapping.published(model, variants);
        Set<String> before = mediaOfCurrentDraft(published, model.getDraft(), StorefrontModelRequest.class,
                mapping::media);

        ObjectNode accumulated = StorefrontDraftMerge.accumulate(model.getDraft(),
                StorefrontDraftMerge.readPatch(patchJson));
        StorefrontModelRequest merged = validated(
                StorefrontDraftMerge.merge(published, accumulated.toString(), StorefrontModelRequest.class));
        rejectUnknownVariants(merged, variants);

        model.setDraft(accumulated.toString());
        models.saveAndFlush(model);
        mediaCleaner.forget(before);
        return merged;
    }

    /**
     * Правка цветового варианта. Черновик варианта живёт ВНУТРИ черновика своей
     * модели под ключом `products.id` — владелец правит карточку целиком и жмёт
     * «Опубликовать» один раз, а черновик на отдельной строке разъехался бы, и
     * на витрине оказалась бы половина правки.
     */
    @Transactional
    public StorefrontModelRequest saveVariantDraft(String productId, String patchJson) {
        Product variant = products.findById(productId)
                .orElseThrow(() -> new NotFoundException("variant_not_found"));
        if (variant.getModelId() == null) {
            throw new BadRequestException("variant_has_no_model");
        }
        ObjectNode variantPatch = StorefrontDraftMerge.readPatch(patchJson);
        ObjectNode wrapped = variantPatch.objectNode();
        wrapped.putObject("variants").set(productId, variantPatch);
        // Вызов внутри класса минует прокси Spring, но транзакция уже открыта
        // этим методом, а @CacheEvict на черновике и не нужен: публичный ответ
        // черновик не меняет.
        return saveModelDraft(variant.getModelId(), wrapped.toString());
    }

    @Transactional
    public StorefrontModelRequest publishModel(UUID id) {
        ProductModel model = model(id);
        List<Product> variants = products.findByModelIdOrderBySortOrderAsc(id);
        StorefrontModelRequest published = mapping.published(model, variants);
        if (model.getDraft() == null) {
            return published;
        }
        StorefrontModelRequest merged = validated(
                StorefrontDraftMerge.merge(published, model.getDraft(), StorefrontModelRequest.class));
        rejectUnknownVariants(merged, variants);

        Set<String> replaced = mapping.media(published);
        mapping.apply(merged, model, variants.stream().collect(Collectors.toMap(Product::getId, Function.identity())));
        model.setDraft(null);
        models.saveAndFlush(model);
        products.saveAllAndFlush(variants);
        mediaCleaner.forget(replaced);
        return merged;
    }

    @Transactional
    public StorefrontModelRequest discardModelDraft(UUID id) {
        ProductModel model = model(id);
        List<Product> variants = products.findByModelIdOrderBySortOrderAsc(id);
        StorefrontModelRequest published = mapping.published(model, variants);
        Set<String> abandoned = mediaOfCurrentDraft(published, model.getDraft(), StorefrontModelRequest.class,
                mapping::media);

        model.setDraft(null);
        models.saveAndFlush(model);
        mediaCleaner.forget(abandoned);
        return published;
    }

    // =========================================================== образы

    @Transactional
    public StorefrontSetRequest saveSetDraft(UUID id, String patchJson) {
        ProductSet set = set(id);
        StorefrontSetRequest published = mapping.published(set, setItems.findBySetIdOrderByPositionAsc(id));
        Set<String> before = mediaOfCurrentDraft(published, set.getDraft(), StorefrontSetRequest.class, mapping::media);

        ObjectNode accumulated = StorefrontDraftMerge.accumulate(set.getDraft(),
                StorefrontDraftMerge.readPatch(patchJson));
        StorefrontSetRequest merged = validated(
                StorefrontDraftMerge.merge(published, accumulated.toString(), StorefrontSetRequest.class));
        rejectUnknownSetItems(merged);

        set.setDraft(accumulated.toString());
        sets.saveAndFlush(set);
        mediaCleaner.forget(before);
        return merged;
    }

    @Transactional
    public StorefrontSetRequest publishSet(UUID id) {
        ProductSet set = set(id);
        StorefrontSetRequest published = mapping.published(set, setItems.findBySetIdOrderByPositionAsc(id));
        if (set.getDraft() == null) {
            return published;
        }
        StorefrontSetRequest merged = validated(
                StorefrontDraftMerge.merge(published, set.getDraft(), StorefrontSetRequest.class));
        rejectUnknownSetItems(merged);

        Set<String> replaced = mapping.media(published);
        mapping.apply(merged, set);
        set.setDraft(null);
        sets.saveAndFlush(set);
        // Состав образа правится списком целиком: старые строки уходят, новые
        // приходят. UNIQUE (set_id, product_id) не даёт слить их в одну запись.
        setItems.deleteBySetId(id);
        setItems.flush();
        setItems.saveAllAndFlush(mapping.itemsOf(id, merged));
        mediaCleaner.forget(replaced);
        return merged;
    }

    @Transactional
    public StorefrontSetRequest discardSetDraft(UUID id) {
        ProductSet set = set(id);
        StorefrontSetRequest published = mapping.published(set, setItems.findBySetIdOrderByPositionAsc(id));
        Set<String> abandoned = mediaOfCurrentDraft(published, set.getDraft(), StorefrontSetRequest.class,
                mapping::media);

        set.setDraft(null);
        sets.saveAndFlush(set);
        mediaCleaner.forget(abandoned);
        return published;
    }

    // =========================================================== что лежит в черновиках

    @Transactional(readOnly = true)
    public List<StorefrontDraftSummary> drafts() {
        List<StorefrontDraftSummary> summaries = new ArrayList<>();
        for (StorefrontSection s : sections.findByDraftIsNotNull()) {
            summaries.add(new StorefrontDraftSummary("section", s.getId().toString(), s.getSlug(),
                    changedFields(s.getDraft())));
        }
        for (ProductModel m : models.findByDraftIsNotNull()) {
            summaries.add(new StorefrontDraftSummary("model", m.getId().toString(), m.getSlug(),
                    changedFields(m.getDraft())));
        }
        for (ProductSet s : sets.findByDraftIsNotNull()) {
            summaries.add(new StorefrontDraftSummary("set", s.getId().toString(), s.getKey(),
                    changedFields(s.getDraft())));
        }
        summaries.sort(Comparator.comparing(StorefrontDraftSummary::kind).thenComparing(StorefrontDraftSummary::key));
        return summaries;
    }

    private static List<String> changedFields(String draftJson) {
        List<String> paths = new ArrayList<>();
        collectPaths(StorefrontDraftMerge.readPatch(draftJson), "", paths);
        return paths;
    }

    private static void collectPaths(JsonNode node, String prefix, List<String> out) {
        for (Iterator<Map.Entry<String, JsonNode>> it = node.fields(); it.hasNext(); ) {
            Map.Entry<String, JsonNode> field = it.next();
            String path = prefix.isEmpty() ? field.getKey() : prefix + "." + field.getKey();
            if (field.getValue().isObject() && field.getValue().size() > 0) {
                collectPaths(field.getValue(), path, out);
            } else {
                out.add(path);
            }
        }
    }

    // =========================================================== общее

    private <T> T validated(T dto) {
        Set<ConstraintViolation<T>> violations = validator.validate(dto);
        if (!violations.isEmpty()) {
            // ConstraintViolationException уже разбирает RestExceptionHandler в
            // 400 со списком полей — прямая запись отвечает ровно так же.
            throw new ConstraintViolationException(violations);
        }
        return dto;
    }

    /**
     * Медиа, на которые ссылается витрина с учётом ЕЩЁ НЕ УБРАННОГО черновика.
     * Список кандидатов на уборку: то, что после правки не найдётся нигде,
     * удалит {@link StorefrontMediaCleaner}.
     */
    private <T> Set<String> mediaOfCurrentDraft(T published, String draftJson, Class<T> type,
                                                Function<T, Set<String>> media) {
        Set<String> urls = new LinkedHashSet<>(media.apply(published));
        if (draftJson != null) {
            urls.addAll(media.apply(StorefrontDraftMerge.merge(published, draftJson, type)));
        }
        return urls;
    }

    private void rejectUnknownVariants(StorefrontModelRequest merged, List<Product> variants) {
        Map<String, Product> known = variants.stream().collect(
                Collectors.toMap(Product::getId, Function.identity(), (a, b) -> a, LinkedHashMap::new));
        for (String id : merged.variants().keySet()) {
            if (!known.containsKey(id)) {
                throw new BadRequestException("unknown_variant:" + id);
            }
        }
    }

    private void rejectUnknownSetItems(StorefrontSetRequest merged) {
        List<String> ids = merged.items().stream().map(StorefrontSetItemRequest::productId).toList();
        if (ids.isEmpty()) {
            return;
        }
        Set<String> known = products.findAllById(ids).stream().map(Product::getId).collect(Collectors.toSet());
        Set<String> seen = new LinkedHashSet<>();
        for (String id : ids) {
            if (!known.contains(id)) {
                throw new BadRequestException("unknown_set_item:" + id);
            }
            // Дубликат ловим здесь же — UNIQUE (set_id, product_id) из V29 иначе
            // ответит пятисоткой драйвера вместо понятного отказа.
            if (!seen.add(id)) {
                throw new BadRequestException("duplicate_set_item:" + id);
            }
        }
    }

    private StorefrontSection section(UUID id) {
        return sections.findById(id).orElseThrow(() -> new NotFoundException("section_not_found"));
    }

    private ProductModel model(UUID id) {
        return models.findById(id).orElseThrow(() -> new NotFoundException("model_not_found"));
    }

    private ProductSet set(UUID id) {
        return sets.findById(id).orElseThrow(() -> new NotFoundException("set_not_found"));
    }
}
