package com.reinasleo.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reinasleo.api.dto.SiteDayPoint;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Дневные числа сайта — в приём аналитики (leo_analytics, типы site_daily и
 * site_daily_pages). Наружу уходят только числа: ни session_key, ни user_id
 * приём не примет, и мы их не шлём.
 *
 * ДЕНЬ ШЛЁТСЯ МНОГОКРАТНО: каждый час — скользящие 14 суток, по сегодня
 * включительно. Приём замещает день целиком, поэтому к вечеру там полные
 * сутки, вчерашний последний час доезжает первым прогоном после полуночи, а
 * простой приёма короче двух недель лечится сам, без ручной доливки. Глубже —
 * ручка POST /api/admin/stats/site-daily/publish?days=N.
 *
 * КЛЮЧ ИДЕМПОТЕНТНОСТИ НЕСЁТ ШТАМП ПРОГОНА (site_daily:<дата>:<штамп>). С
 * ключом по одной дате второй конверт за те же сутки получил бы 409, и день
 * замёрз бы на утренних числах. Поэтому же 409 здесь — провал, а не «уже
 * принято»: штамп у каждого прогона свой, и повтор ключа значит поломку.
 *
 * Не задан адрес или секрет — отправка выключена с предупреждением, API
 * стартует. То же осознанное исключение из «секретов без :default», что у
 * WEB_REVALIDATE_URL: без него API не поднимется ни в CI, ни у разработчика.
 */
@Service
public class SiteDailyPublisher {

    private static final Logger log = LoggerFactory.getLogger(SiteDailyPublisher.class);

    static final int ROLLING_DAYS = 14;
    static final int PAGES_PER_CHUNK = 500;
    // Предел приёма на путь (SitePageRow.path max_length).
    static final int MAX_PATH = 500;
    private static final String SOURCE = "site";

    private final SiteStatsService stats;
    private final AnalyticsIngestClient ingest;

    public SiteDailyPublisher(SiteStatsService stats,
                              ObjectMapper json,
                              @Value("${app.analytics.ingest-url}") String url,
                              @Value("${app.analytics.ingest-secret}") String secret) {
        this.stats = stats;
        this.ingest = new AnalyticsIngestClient(json, url, secret);
    }

    public record Envelope(String key, Map<String, Object> body) {}

    public record Result(boolean enabled, int sent, int failed, List<String> failures) {}

    @Scheduled(cron = "0 7 * * * *", zone = "Europe/Moscow")
    public void publishRecent() {
        LocalDate today = SiteStatsService.today();
        publish(today.minusDays(ROLLING_DAYS - 1L), today);
    }

    public Result publish(LocalDate from, LocalDate to) {
        if (!ingest.enabled()) {
            log.warn("ANALYTICS_INGEST_URL/ANALYTICS_INGEST_SECRET are not set: site daily numbers are not sent to analytics");
            return new Result(false, 0, 0, List.of());
        }
        List<Envelope> envelopes = envelopes(
                stats.getDailyStats(from, to), stats.getDailyPages(from, to), Instant.now());

        int sent = 0;
        List<String> failures = new ArrayList<>();
        for (Envelope envelope : envelopes) {
            String failure = ingest.send(envelope.key(), envelope.body());
            if (failure == null) sent++;
            else failures.add(envelope.key() + ": " + failure);
        }
        if (!failures.isEmpty()) {
            log.error("Site daily → analytics: {} of {} envelopes failed: {}",
                    failures.size(), envelopes.size(), failures);
        }
        return new Result(true, sent, failures.size(), failures);
    }

    /**
     * Конверты за окно: на каждые сутки один site_daily и сколько надо кусков
     * site_daily_pages. Сутки без просмотров шлются нулями — это тоже версия
     * дня, — а куски путей для них не шлются: приём требует хотя бы одну строку.
     */
    static List<Envelope> envelopes(List<SiteDayPoint> days, Map<LocalDate, Map<String, Long>> pages, Instant stamp) {
        String capturedAt = stamp.toString();
        long run = stamp.toEpochMilli();
        List<Envelope> out = new ArrayList<>();

        for (SiteDayPoint day : days) {
            Map<String, Object> event = new LinkedHashMap<>();
            event.put("type", "site_daily");
            event.put("date", day.date().toString());
            event.put("page_views", day.pageViews());
            event.put("sessions", day.sessions());
            event.put("product_views", day.productViews());
            event.put("marketplace_clicks", day.marketplaceClicks());
            event.put("add_to_cart", day.addToCart());
            event.put("add_to_favourite", day.addToFavourite());
            event.put("signups", day.signups());
            event.put("by_device", day.byDevice());
            event.put("by_locale", day.byLocale());
            event.put("by_marketplace", day.byMarketplace());
            out.add(new Envelope("site_daily:" + day.date() + ":" + run, body(capturedAt, event)));

            List<Map<String, Object>> rows = pages.getOrDefault(day.date(), Map.of()).entrySet().stream()
                    .filter(e -> e.getKey() != null && !e.getKey().isBlank())
                    .sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder())
                            .thenComparing(Map.Entry.comparingByKey()))
                    .map(e -> Map.<String, Object>of("path", clip(e.getKey()), "views", e.getValue()))
                    .toList();
            for (int i = 0, chunk = 1; i < rows.size(); i += PAGES_PER_CHUNK, chunk++) {
                Map<String, Object> part = new LinkedHashMap<>();
                part.put("type", "site_daily_pages");
                part.put("date", day.date().toString());
                part.put("rows", rows.subList(i, Math.min(i + PAGES_PER_CHUNK, rows.size())));
                out.add(new Envelope("site_daily_pages:" + day.date() + ":" + run + ":" + chunk, body(capturedAt, part)));
            }
        }
        return out;
    }

    private static Map<String, Object> body(String capturedAt, Map<String, Object> event) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("source", SOURCE);
        body.put("captured_at", capturedAt);
        body.put("events", List.of(event));
        return body;
    }

    private static String clip(String path) {
        return path.length() <= MAX_PATH ? path : path.substring(0, MAX_PATH);
    }
}
