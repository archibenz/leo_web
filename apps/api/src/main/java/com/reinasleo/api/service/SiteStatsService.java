package com.reinasleo.api.service;

import com.reinasleo.api.dto.SiteDayPoint;
import com.reinasleo.api.dto.SitePathPoint;
import com.reinasleo.api.repository.SiteEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
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
        LocalDate to = today();
        return getDailyStats(to.minusDays(safeDays), to);
    }

    /**
     * Окно открывается в московскую ПОЛНОЧЬ первых суток, а не «сейчас минус
     * N дней». Прежде так и было, и первые сутки на карточке всегда выходили
     * огрызком — днём меньше, чем было. Для отправки в аналитику это хуже, чем
     * некрасиво: там день ЗАМЕЩАЕТСЯ, и огрызок стёр бы полную версию.
     */
    @Transactional(readOnly = true)
    public List<SiteDayPoint> getDailyStats(LocalDate from, LocalDate to) {
        Instant since = from.atStartOfDay(MOSCOW).toInstant();
        return fold(siteEvents.countsByHour(since), siteEvents.sessionFirstSeen(since), from, to);
    }

    /** Просмотры по адресам за каждые сутки окна, по тому же календарю. */
    @Transactional(readOnly = true)
    public Map<LocalDate, Map<String, Long>> getDailyPages(LocalDate from, LocalDate to) {
        Instant since = from.atStartOfDay(MOSCOW).toInstant();
        return foldPages(siteEvents.pageViewsByHour(since), from, to);
    }

    /** Одна тройка меток за сутки: сколько просмотров пришло с ней. */
    public record UtmRow(String source, String medium, String campaign, long views) {}

    static final int MAX_UTM_VALUE = 100;
    private static final List<String> UTM_KEYS = List.of("utm_source", "utm_medium", "utm_campaign");

    /**
     * Метки utm_* по суткам — для site_daily_sources. Сутки без меток остаются
     * пустым списком: приём замещает день, и пустой список стирает устаревшее.
     */
    @Transactional(readOnly = true)
    public Map<LocalDate, List<UtmRow>> getDailySources(LocalDate from, LocalDate to) {
        Instant since = from.atStartOfDay(MOSCOW).toInstant();
        return foldSources(siteEvents.utmQueriesByHour(since), from, to);
    }

    static Map<LocalDate, List<UtmRow>> foldSources(List<Object[]> hourly, LocalDate from, LocalDate to) {
        Map<LocalDate, Map<List<String>, Long>> byDay = new LinkedHashMap<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            byDay.put(d, new HashMap<>());
        }
        for (Object[] row : hourly) {
            LocalDate day = toInstant(row[0]).atZone(MOSCOW).toLocalDate();
            Map<List<String>, Long> counts = byDay.get(day);
            if (counts == null) continue;
            Map<String, String> utm = parseUtm((String) row[1]);
            if (utm.isEmpty()) continue;
            List<String> key = Arrays.asList(utm.get("utm_source"), utm.get("utm_medium"), utm.get("utm_campaign"));
            counts.merge(key, ((Number) row[2]).longValue(), Long::sum);
        }
        Map<LocalDate, List<UtmRow>> out = new LinkedHashMap<>();
        byDay.forEach((day, counts) -> out.put(day, counts.entrySet().stream()
                .map(e -> new UtmRow(e.getKey().get(0), e.getKey().get(1), e.getKey().get(2), e.getValue()))
                .sorted(Comparator.comparingLong(UtmRow::views).reversed()
                        .thenComparing(r -> String.valueOf(r.source()))
                        .thenComparing(r -> String.valueOf(r.medium()))
                        .thenComparing(r -> String.valueOf(r.campaign())))
                .toList()));
        return out;
    }

    /**
     * Метки из строки запроса: только три ключа, значение раскодировано,
     * обрезано по краям, строчными, не длиннее MAX_UTM_VALUE. Пустое значение —
     * нет метки. Повтор ключа — берётся первый, как у браузера.
     */
    static Map<String, String> parseUtm(String query) {
        Map<String, String> out = new HashMap<>();
        if (query == null) return out;
        for (String pair : query.split("&")) {
            int eq = pair.indexOf('=');
            if (eq <= 0) continue;
            String key = decode(pair.substring(0, eq)).toLowerCase(Locale.ROOT);
            if (!UTM_KEYS.contains(key)) continue;
            String value = decode(pair.substring(eq + 1)).trim().toLowerCase(Locale.ROOT);
            if (value.isEmpty()) continue;
            out.putIfAbsent(key, clip(value));
        }
        return out;
    }

    // Предел приёма — 100 СИМВОЛОВ, а substring считает UTF-16: эмодзи на
    // границе рвался бы пополам, и одинокий суррогат отбил бы конверт (422).
    private static String clip(String value) {
        return value.codePointCount(0, value.length()) <= MAX_UTM_VALUE
                ? value
                : value.substring(0, value.offsetByCodePoints(0, MAX_UTM_VALUE));
    }

    private static String decode(String s) {
        try {
            return URLDecoder.decode(s, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            return s;
        }
    }

    /** Хост реферера за сутки: сколько заходов (первых просмотров) с него. */
    public record ReferrerRow(String host, long sessions) {}

    /** Рефереры по суткам — для referrers в site_daily_sources. */
    @Transactional(readOnly = true)
    public Map<LocalDate, List<ReferrerRow>> getDailyReferrers(LocalDate from, LocalDate to) {
        Instant since = from.atStartOfDay(MOSCOW).toInstant();
        return foldReferrers(siteEvents.referrersByHour(since), from, to);
    }

    static Map<LocalDate, List<ReferrerRow>> foldReferrers(List<Object[]> hourly, LocalDate from, LocalDate to) {
        Map<LocalDate, Map<String, Long>> byDay = foldPages(hourly, from, to);
        Map<LocalDate, List<ReferrerRow>> out = new LinkedHashMap<>();
        byDay.forEach((day, hosts) -> out.put(day, hosts.entrySet().stream()
                .map(e -> new ReferrerRow(e.getKey(), e.getValue()))
                .sorted(Comparator.comparingLong(ReferrerRow::sessions).reversed().thenComparing(ReferrerRow::host))
                .toList()));
        return out;
    }

    public static LocalDate today() {
        return Instant.now().atZone(MOSCOW).toLocalDate();
    }

    /**
     * Часы с адресами — в сутки. Сутки без просмотров остаются пустой картой,
     * а не пропадают: отправитель сам решает, что с ними делать.
     */
    static Map<LocalDate, Map<String, Long>> foldPages(List<Object[]> hourly, LocalDate from, LocalDate to) {
        Map<LocalDate, Map<String, Long>> byDay = new LinkedHashMap<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            byDay.put(d, new HashMap<>());
        }
        for (Object[] row : hourly) {
            LocalDate day = toInstant(row[0]).atZone(MOSCOW).toLocalDate();
            Map<String, Long> pages = byDay.get(day);
            if (pages == null) continue;
            pages.merge((String) row[1], ((Number) row[2]).longValue(), Long::sum);
        }
        return byDay;
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
                case "preorder" -> bucket.preorders += count;
                default -> { /* checkout_start — в запасе до своей оплаты, витриной не шлётся */ }
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
                bucket.addToCart, bucket.addToFavourite, bucket.signups, bucket.preorders,
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
        long preorders;
        final Map<String, Long> byDevice = new HashMap<>();
        final Map<String, Long> byLocale = new HashMap<>();
        final Map<String, Long> byMarketplace = new HashMap<>();
    }
}
