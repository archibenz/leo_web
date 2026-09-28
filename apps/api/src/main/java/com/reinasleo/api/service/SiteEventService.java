package com.reinasleo.api.service;

import com.reinasleo.api.dto.SiteEventRequest;
import com.reinasleo.api.dto.SiteEventTypes;
import com.reinasleo.api.model.SiteEvent;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.SiteEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class SiteEventService {

    private final SiteEventRepository siteEventRepository;

    public SiteEventService(SiteEventRepository siteEventRepository) {
        this.siteEventRepository = siteEventRepository;
    }

    @Transactional
    public void recordBatch(List<SiteEventRequest> events, User requester) {
        for (SiteEventRequest req : events) {
            SiteEvent event = new SiteEvent();
            event.setEventType(req.eventType());
            event.setSessionKey(req.sessionKey());
            event.setProductId(req.productId());
            event.setModelId(req.modelId());
            event.setPath(req.path());
            event.setLocale(req.locale());
            event.setDevice(req.device());
            event.setMarketplace(req.marketplace());
            event.setReferrerHost("page_view".equals(req.eventType()) ? normalizeReferrerHost(req.referrerHost()) : null);
            // user_id is server-resolved from the authenticated principal, never
            // from the request body (the endpoint is public — trusting a
            // client-sent id would let anyone attribute events to any account).
            // Restricted further to event types that already require login:
            // views/clicks stay anonymous even for a signed-in visitor.
            boolean eligible = SiteEventTypes.REQUIRES_USER.contains(req.eventType());
            event.setUserId(eligible && requester != null ? requester.getId() : null);
            siteEventRepository.save(event);
        }
    }

    // Хост в виде a.b(.c…), строчными, без «www.»; 'direct' — как есть. Всё
    // прочее (пусто, схема, путь, порт, мусор) — NULL: источник неизвестен, но
    // просмотр засчитан.
    private static final Pattern HOST = Pattern.compile(
            "^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$");

    // Предел приёма аналитики (leo_analytics #217: host ≤100, иначе 422 на весь
    // день). Длиннее — почти наверняка мусор; обнуляется, а не обрезается:
    // обрезанный хост — уже чужой хост.
    static final int MAX_HOST = 100;

    static String normalizeReferrerHost(String raw) {
        if (raw == null) return null;
        String host = raw.trim().toLowerCase(Locale.ROOT);
        if (host.equals("direct")) return host;
        if (host.startsWith("www.")) host = host.substring(4);
        return host.length() <= MAX_HOST && HOST.matcher(host).matches() ? host : null;
    }
}
