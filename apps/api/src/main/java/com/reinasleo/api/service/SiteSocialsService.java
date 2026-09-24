package com.reinasleo.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reinasleo.api.dto.PublicSocialLink;
import com.reinasleo.api.dto.SocialLink;
import com.reinasleo.api.dto.SocialLinksRequest;
import com.reinasleo.api.model.SiteConfig;
import com.reinasleo.api.repository.SiteConfigRepository;
import com.reinasleo.api.service.storefront.NextRevalidator;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Соцсети — один список на весь сайт: подвал, страница контактов, разметка
 * для поисковиков. Хранится в site_config под своим ключом, но пишется
 * ТОЛЬКО здесь, со своей проверкой: адреса уходят в подвал сайта, и общий
 * PUT /api/admin/config/{key}, принимающий любой JSON, для этого не годится
 * (lw-mssr).
 *
 * Проверка строгая: только https и только домен СВОЕЙ сети. Опечатка или
 * чужой сайт под видом Telegram до покупателя не доедут.
 */
@Service
public class SiteSocialsService {

    static final String KEY = "social_links";
    private static final int MAX_HREF = 200;

    // Порядок — порядок показа, когда владелец ещё ничего не сохранял.
    private static final Map<String, Set<String>> HOSTS = Map.of(
            "instagram", Set.of("instagram.com", "www.instagram.com"),
            "telegram", Set.of("t.me"),
            "vk", Set.of("vk.com", "m.vk.com", "vk.ru"));

    // Те три, что стояли на сайте до 24.09 (подвал: Instagram и Telegram,
    // контакты: Telegram и VK). Пока владелец не сохранял — показываются все.
    static final List<SocialLink> DEFAULTS = List.of(
            new SocialLink("instagram", "https://instagram.com/reinasleo", true),
            new SocialLink("telegram", "https://t.me/reinasleo", true),
            new SocialLink("vk", "https://vk.com/reinasleo", true));

    private record Stored(List<SocialLink> links) {}

    private final SiteConfigRepository siteConfig;
    private final ObjectMapper json;
    private final NextRevalidator nextRevalidator;

    public SiteSocialsService(SiteConfigRepository siteConfig, ObjectMapper json, NextRevalidator nextRevalidator) {
        this.siteConfig = siteConfig;
        this.json = json;
        this.nextRevalidator = nextRevalidator;
    }

    @Transactional(readOnly = true)
    public List<SocialLink> all() {
        return siteConfig.findById(KEY)
                .map(row -> parse(row.getValue()))
                .orElse(DEFAULTS);
    }

    @Transactional(readOnly = true)
    public List<PublicSocialLink> shown() {
        return all().stream()
                .filter(l -> Boolean.TRUE.equals(l.shown()))
                .map(l -> new PublicSocialLink(l.network(), l.href()))
                .toList();
    }

    @Transactional
    public List<SocialLink> save(SocialLinksRequest request) {
        List<SocialLink> links = request.links().stream().map(SiteSocialsService::checked).toList();
        Set<String> seen = new HashSet<>();
        for (SocialLink l : links) {
            if (!seen.add(l.network())) throw bad("сеть указана дважды: " + l.network());
        }

        SiteConfig row = siteConfig.findById(KEY).orElseGet(() -> {
            SiteConfig c = new SiteConfig();
            c.setKey(KEY);
            return c;
        });
        try {
            row.setValue(json.writeValueAsString(new Stored(links)));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
        siteConfig.save(row);
        nextRevalidator.storefrontChanged();
        return links;
    }

    private List<SocialLink> parse(String value) {
        try {
            Stored stored = json.readValue(value, Stored.class);
            return stored.links() == null ? List.of() : stored.links();
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("site_config." + KEY + " не читается", e);
        }
    }

    static SocialLink checked(SocialLink link) {
        if (link == null || link.network() == null) throw bad("не указана сеть");
        String network = link.network().trim().toLowerCase(Locale.ROOT);
        Set<String> hosts = HOSTS.get(network);
        if (hosts == null) throw bad("неизвестная сеть: " + link.network());

        String href = link.href() == null ? "" : link.href().trim();
        if (href.isEmpty() || href.length() > MAX_HREF || href.chars().anyMatch(Character::isWhitespace)) {
            throw bad("адрес пуст, длиннее " + MAX_HREF + " символов или с пробелами");
        }
        URI uri;
        try {
            uri = new URI(href);
        } catch (URISyntaxException e) {
            throw bad("адрес не читается: " + href);
        }
        if (!"https".equalsIgnoreCase(uri.getScheme())) throw bad("только https: " + href);
        if (uri.getRawUserInfo() != null || uri.getPort() != -1) throw bad("лишнее в адресе: " + href);
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
        if (!hosts.contains(host)) throw bad("адрес " + network + " должен вести на " + String.join(" или ", hosts));
        String path = uri.getRawPath() == null ? "" : uri.getRawPath();
        if (path.length() <= 1) throw bad("в адресе нет страницы: " + href);

        return new SocialLink(network, href, link.shown() == null || link.shown());
    }

    private static ResponseStatusException bad(String reason) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason);
    }
}
