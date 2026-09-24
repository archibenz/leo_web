package com.reinasleo.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reinasleo.api.dto.LocalizedText;
import com.reinasleo.api.dto.SiteTextsRequest;
import com.reinasleo.api.model.SiteConfig;
import com.reinasleo.api.repository.SiteConfigRepository;
import com.reinasleo.api.service.storefront.NextRevalidator;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * «Тексты сайта» — правки заголовков и подписей витрины, которые владелец
 * делает сам (решение 24.09, этап 3). Хранятся только ПРАВКИ: нет правки —
 * витрина берёт текст из перевода. Пишется только здесь (не общий
 * PUT /api/admin/config, lw-mssr).
 *
 * БЕЛЫЙ СПИСОК: ключ словаря витрины → предел длины. Юридические тексты и
 * служебные подписи сюда не входят. Список обязан совпадать с
 * apps/web/lib/site/texts.ts (SITE_TEXT_FIELDS): ключа нет здесь — форма
 * получит 400 «неизвестный текст».
 *
 * Сервер словаря витрины не видит, поэтому проверяет только безопасность:
 * длина, никаких угловых скобок, фигурные — только как плейсхолдер {слово}.
 * Совпадение плейсхолдеров с исходным текстом сверяет витрина при подмешивании
 * (и форма до сохранения): не совпало — показывается исходный текст.
 *
 * white.pdp.preorderNoteWithSize в списке НЕТ нарочно: подпись видна только при
 * выбранном размере, а размер на витрине выбрать нельзя (whiteInStock сейчас
 * всегда false, кнопки размеров неактивны). Правка ничего бы не меняла — поле
 * врало бы владельцу.
 */
@Service
public class SiteTextsService {

    static final String KEY = "site_texts";

    static final Map<String, Integer> FIELDS = Map.ofEntries(
            // Главная
            Map.entry("white.landing.theEdit", 60),
            Map.entry("white.landing.houseLine", 160),
            Map.entry("white.landing.shopCollection", 40),
            Map.entry("white.sets.explore", 40),
            // Карточка товара
            Map.entry("white.pdp.season", 40),
            Map.entry("white.pdp.deliveryValue", 60),
            Map.entry("white.pdp.about", 40),
            Map.entry("white.pdp.completeLook", 40),
            Map.entry("white.pdp.preorder", 30),
            Map.entry("white.pdp.preorderTitle", 60),
            Map.entry("white.pdp.preorderBody", 300),
            Map.entry("white.pdp.preorderNote", 80),
            Map.entry("white.pdp.preorderSubmit", 30),
            Map.entry("white.pdp.preorderSent", 200),
            // Сеты
            Map.entry("white.sets.eyebrow", 40),
            Map.entry("white.sets.title", 80),
            Map.entry("white.sets.intro", 400),
            // Лукбук
            Map.entry("white.lookbook.eyebrow", 40),
            Map.entry("white.lookbook.title", 80),
            Map.entry("white.lookbook.intro", 400),
            // Контакты
            Map.entry("white.contact.eyebrow", 40),
            Map.entry("white.contact.title", 80),
            Map.entry("white.contact.intro", 400),
            Map.entry("white.contact.responseTime", 160));

    private static final Pattern PLACEHOLDER = Pattern.compile("\\{[A-Za-z]+}");
    private static final Pattern EMAIL = Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
    private static final int MAX_EMAIL = 120;

    private final SiteConfigRepository siteConfig;
    private final ObjectMapper json;
    private final NextRevalidator nextRevalidator;

    public SiteTextsService(SiteConfigRepository siteConfig, ObjectMapper json, NextRevalidator nextRevalidator) {
        this.siteConfig = siteConfig;
        this.json = json;
        this.nextRevalidator = nextRevalidator;
    }

    @Transactional(readOnly = true)
    public SiteTextsRequest edits() {
        return siteConfig.findById(KEY)
                .map(row -> parse(row.getValue()))
                .orElse(new SiteTextsRequest(Map.of(), null));
    }

    @Transactional
    public SiteTextsRequest save(SiteTextsRequest request) {
        Map<String, LocalizedText> clean = new LinkedHashMap<>();
        if (request.texts() != null) {
            request.texts().forEach((key, text) -> {
                Integer max = FIELDS.get(key);
                if (max == null) throw bad("неизвестный текст: " + key);
                String ru = checked(key, "ru", text == null ? null : text.ru(), max);
                String en = checked(key, "en", text == null ? null : text.en(), max);
                if (ru != null || en != null) clean.put(key, new LocalizedText(ru, en));
            });
        }
        String email = checkedEmail(request.contactEmail());
        SiteTextsRequest stored = new SiteTextsRequest(clean, email);

        SiteConfig row = siteConfig.findById(KEY).orElseGet(() -> {
            SiteConfig c = new SiteConfig();
            c.setKey(KEY);
            return c;
        });
        try {
            row.setValue(json.writeValueAsString(stored));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
        siteConfig.save(row);
        nextRevalidator.storefrontChanged();
        return stored;
    }

    private SiteTextsRequest parse(String value) {
        try {
            SiteTextsRequest stored = json.readValue(value, SiteTextsRequest.class);
            return new SiteTextsRequest(stored.texts() == null ? Map.of() : stored.texts(), stored.contactEmail());
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("site_config." + KEY + " не читается", e);
        }
    }

    /** null/пусто — «как было». Иначе — проверенный текст без пробелов по краям. */
    static String checked(String key, String lang, String value, int max) {
        if (value == null) return null;
        String text = value.strip();
        if (text.isEmpty()) return null;
        String where = key + " (" + lang + "): ";
        if (text.length() > max) throw bad(where + "длиннее " + max + " символов");
        if (text.indexOf('<') >= 0 || text.indexOf('>') >= 0) throw bad(where + "угловые скобки нельзя");
        if (text.contains("'{") || text.contains("}'")) throw bad(where + "апостроф вплотную к {…} ломает подстановку");
        String withoutPlaceholders = PLACEHOLDER.matcher(text).replaceAll("");
        if (withoutPlaceholders.indexOf('{') >= 0 || withoutPlaceholders.indexOf('}') >= 0) {
            throw bad(where + "фигурные скобки — только как {слово} из исходного текста");
        }
        return text;
    }

    static String checkedEmail(String value) {
        if (value == null) return null;
        String email = value.strip();
        if (email.isEmpty()) return null;
        if (email.length() > MAX_EMAIL || !EMAIL.matcher(email).matches()) throw bad("почта не похожа на адрес: " + email);
        return email;
    }

    private static ResponseStatusException bad(String reason) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }
}
