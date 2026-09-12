package com.reinasleo.api.service.storefront;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.reinasleo.api.exception.BadRequestException;

import java.util.Iterator;
import java.util.Map;

/**
 * ЕДИНСТВЕННОЕ место, где черновик накладывается на опубликованное.
 *
 * Её зовут и предпросмотр, и публикация, и сохранение черновика. Вторая
 * реализация разъедется с первой, и владелец увидит одно, а получит другое —
 * это худший дефект редактора: он подрывает доверие ко всему инструменту.
 * Если понадобится ещё одно слияние — менять эту функцию, а не заводить рядом.
 *
 * Правила наложения:
 *   • ключа в черновике нет     → остаётся опубликованное значение;
 *   • ключ есть со значением    → значение черновика побеждает;
 *   • ключ есть со значением null → поле очищается (снять постер — намерение,
 *     а не забытый ключ);
 *   • массив заменяется целиком — состав образа и галерея правятся списком;
 *   • вложенные объекты сливаются по тем же правилам (вариант внутри модели).
 *
 * Неизвестный ключ — отказ. JSONB не проверяет ничего, и опечатка в ключе
 * иначе тихо доедет до витрины: черновик молча ничего не изменит, а владелец
 * будет уверен, что правка сохранена.
 */
public final class StorefrontDraftMerge {

    private static final ObjectMapper MAPPER = JsonMapper.builder()
            .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .build();

    private StorefrontDraftMerge() {}

    public static <T> T merge(T published, String draftJson, Class<T> type) {
        if (draftJson == null || draftJson.isBlank()) {
            return published;
        }
        JsonNode draft = parse(draftJson);
        if (!draft.isObject()) {
            throw new BadRequestException("draft_must_be_an_object");
        }
        ObjectNode merged = MAPPER.valueToTree(published);
        overlay(merged, (ObjectNode) draft);
        try {
            return MAPPER.treeToValue(merged, type);
        } catch (UnrecognizedPropertyException e) {
            throw new BadRequestException("draft_has_unknown_field:" + e.getPropertyName());
        } catch (Exception e) {
            throw new BadRequestException("draft_does_not_fit_the_shape");
        }
    }

    /**
     * Накопление правок: новый патч ложится на уже сохранённый черновик по тем
     * же правилам (общий overlay ниже). Редактор шлёт только изменённое поле,
     * и без накопления вторая правка стирала бы первую.
     */
    public static ObjectNode accumulate(String existingDraftJson, ObjectNode patch) {
        ObjectNode accumulated = existingDraftJson == null || existingDraftJson.isBlank()
                ? MAPPER.createObjectNode()
                : readPatch(existingDraftJson);
        overlay(accumulated, patch);
        return accumulated;
    }

    /** Черновик, каким его прислал редактор, — проверяем форму, ничего не накладывая. */
    public static ObjectNode readPatch(String draftJson) {
        JsonNode patch = parse(draftJson);
        if (!patch.isObject()) {
            throw new BadRequestException("draft_must_be_an_object");
        }
        return (ObjectNode) patch;
    }

    private static JsonNode parse(String draftJson) {
        try {
            return MAPPER.readTree(draftJson);
        } catch (Exception e) {
            throw new BadRequestException("draft_is_not_valid_json");
        }
    }

    private static void overlay(ObjectNode target, ObjectNode patch) {
        for (Iterator<Map.Entry<String, JsonNode>> it = patch.fields(); it.hasNext(); ) {
            Map.Entry<String, JsonNode> field = it.next();
            JsonNode incoming = field.getValue();
            JsonNode current = target.get(field.getKey());
            if (incoming.isObject() && current != null && current.isObject()) {
                overlay((ObjectNode) current, (ObjectNode) incoming);
            } else {
                target.set(field.getKey(), incoming);
            }
        }
    }
}
