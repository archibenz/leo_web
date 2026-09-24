package com.reinasleo.api.service;

import com.reinasleo.api.dto.SiteDayPoint;
import com.reinasleo.api.dto.SitePathPoint;
import com.reinasleo.api.repository.SiteEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Чтение site_events. Таблица наполняется с 13.09.2026, а достать из неё
 * до сих пор было нечем: репозиторий умел только два запроса, оба про ГДПР.
 *
 * СУТКИ СЧИТАЮТСЯ ПО МОСКВЕ, и это решение, а не умолчание. Соседние карточки
 * дашборда (регистрации, визиты бота) режут день по UTC — значит ночной час
 * магазина уезжает у них во вчера. Здесь так не сделано: владелец живёт по
 * Москве, аналитика (leo_analytics) тоже считает сутки по Москве, и числа с
 * двух сторон обязаны сходиться. Расхождение со старыми карточками записано
 * отдельной задачей, а не унаследовано молча.
 *
 * Календарь живёт здесь, а не в SQL, потому что в SQL его нечем проверить:
 * H2 принимает AT TIME ZONE и не сдвигает (см. SiteEventRepository и lw-1h34).
 */
@Service
public class SiteStatsService {

    static final ZoneId MOSCOW = ZoneId.of("Europe/Moscow");

    private static final int MAX_DAYS = 365;
    private static final int MAX_PATHS = 50;

    private final SiteEventRepository siteEvents;

    public SiteStatsService(SiteEventRepository siteEvents) {
        this.siteEvents = siteEvents;
    }

    @Transactional(readOnly = true)
    public List<SiteDayPoint> getDailyStats(int days) {
        int safeDays = Math.max(1, Math.min(days, MAX_DAYS));
        Instant since = Instant.now().minus(safeDays, ChronoUnit.DAYS);
        LocalDate from = since.atZone(MOSCOW).toLocalDate();
        LocalDate to = Instant.now().atZone(MOSCOW).toLocalDate();
        return fold(siteEvents.countsByHour(since), siteEvents.sessionFirstSeen(since), from, to);
    }

    @Transactional(readOnly = true)
    public List<SitePathPoint> getTopPaths(int days, int limit) {
        int safeDays = Math.max(1, Math.min(days, MAX_DAYS));
        int safeLimit = Math.max(1, Math.min(limit, MAX_PATHS));
        Instant since = Instant.now().minus(safeDays, ChronoUnit.DAYS);
        return siteEvents.topPaths(since, safeLimit).stream()
                .map(row -> new SitePathPoint((String) row[0], ((Number) row[1]).longValue()))
                .toList();
    }

    /**
     * Раскладывает часовые счётчики и сессии по московским суткам.
     *
     * Отдельно от базы и без Spring — вся арифметика календаря проверяется
     * юнит-тестом, который может позволить себе полночь, и вчера, и 23:30 UTC.
     *
     * Пустые сутки отдаются нулями, а не пропускаются: график с дырой читается
     * как «данных нет», а не как «в этот день никто не заходил», и владелец
     * задаёт вопрос не про магазин, а про сбор.
     */
    static List<SiteDayPoint> fold(List<Object[]> hourly, List<Object[]> sessions, LocalDate from, LocalDate to) {
        Map<LocalDate, DayBucket> byDay = new LinkedHashMap<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            byDay.put(d, new DayBucket());
        }

        for (Object[] row : hourly) {
            LocalDate day = toInstant(row[0]).atZone(MOSCOW).toLocalDate();
            DayBucket bucket = byDay.get(day);
            if (bucket == null) continue; // час вне запрошенного окна — за границей суток
            String type = (String) row[1];
            String device = (String) row[2];
            String locale = (String) row[3];
            String marketplace = (String) row[4];
            long count = ((Number) row[5]).longValue();

            switch (type) {
                case "page_view" -> {
                    bucket.pageViews += count;
                    // Разрезы считаются ТОЛЬКО по просмотрам страниц. Иначе одно
                    // посещение, добавившее товар в корзину, попадало бы в
                    // «мобильные» дважды, и сумма разреза разъезжалась бы с
                    // числом рядом.
                    if (!device.isEmpty()) bucket.byDevice.merge(device, count, Long::sum);
                    if (!locale.isEmpty()) bucket.byLocale.merge(locale, count, Long::sum);
                }
                case "product_view" -> bucket.productViews += count;
                case "marketplace_click" -> {
                    bucket.marketplaceClicks += count;
                    if (!marketplace.isEmpty()) bucket.byMarketplace.merge(marketplace, count, Long::sum);
                }
                case "add_to_cart" -> bucket.addToCart += count;
                case "add_to_favourite" -> bucket.addToFavourite += count;
                case "signup" -> bucket.signups += count;
                default -> { /* checkout_start объявлен, но витриной не шлётся */ }
            }
        }

        for (Object[] row : sessions) {
            LocalDate day = toInstant(row[1]).atZone(MOSCOW).toLocalDate();
            DayBucket bucket = byDay.get(day);
            if (bucket != null) bucket.sessions++;
        }

        List<SiteDayPoint> out = new ArrayList<>(byDay.size());
        byDay.forEach((day, bucket) -> out.add(new SiteDayPoint(
                day, bucket.pageViews, bucket.sessions, bucket.productViews, bucket.marketplaceClicks,
                bucket.addToCart, bucket.addToFavourite, bucket.signups,
                bucket.byDevice, bucket.byLocale, bucket.byMarketplace)));
        return out;
    }

    /**
     * Нативный запрос отдаёт момент по-разному: PostgreSQL через драйвер даёт
     * Timestamp или OffsetDateTime, H2 — Timestamp. Приводим здесь, а не
     * гадаем на месте: неверный разбор сдвинул бы сутки молча.
     */
    private static Instant toInstant(Object value) {
        if (value instanceof Instant i) return i;
        if (value instanceof Timestamp t) return t.toInstant();
        if (value instanceof OffsetDateTime o) return o.toInstant();
        throw new IllegalStateException("неизвестный тип момента: " + value.getClass());
    }

    private static final class DayBucket {
        long pageViews;
        long sessions;
        long productViews;
        long marketplaceClicks;
        long addToCart;
        long addToFavourite;
        long signups;
        final Map<String, Long> byDevice = new HashMap<>();
        final Map<String, Long> byLocale = new HashMap<>();
        final Map<String, Long> byMarketplace = new HashMap<>();
    }
}
