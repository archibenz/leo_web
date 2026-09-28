package com.reinasleo.api.service;

import com.reinasleo.api.dto.SiteDayPoint;
import com.reinasleo.api.repository.SiteEventRepository;
import org.junit.jupiter.api.Test;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

/**
 * Сторож на КАЛЕНДАРЬ, а не на запросы. Ради него раскладка по суткам и
 * вынесена из SQL: в базе её проверить нечем — H2 принимает
 * AT TIME ZONE и молча не сдвигает (см. lw-1h34), то есть проверка была бы
 * зелёной при неверном ответе.
 *
 * Здесь же час задаётся руками, и можно взять ровно те моменты, на которых
 * ошибка в зоне видна: 23:30 UTC (в Москве это уже следующие сутки) и
 * 20:30 UTC (в Москве это ещё те же).
 *
 * Проверено мутацией: подменить Europe/Moscow на UTC — краснеют ровно два
 * кейса, оба про границу суток.
 */
class SiteStatsServiceTest {

    private static Object[] hour(String instant, String type, String device, String locale, String marketplace, long count) {
        return new Object[]{Timestamp.from(Instant.parse(instant)), type, device, locale, marketplace, count};
    }

    private static Object[] session(String key, String instant) {
        return new Object[]{key, Timestamp.from(Instant.parse(instant))};
    }

    private static SiteDayPoint day(List<SiteDayPoint> days, String date) {
        return days.stream().filter(d -> d.date().equals(LocalDate.parse(date))).findFirst().orElseThrow();
    }

    @Test
    void nightEventBelongsToTheMoscowDay() {
        // 21.09 23:30 UTC — это 22.09, 02:30 по Москве. Считать по UTC значило
        // бы отдать владельцу ночной трафик вчерашним днём.
        List<SiteDayPoint> days = SiteStatsService.fold(
                List.<Object[]>of(hour("2026-09-21T23:30:00Z", "page_view", "mobile", "ru", "", 5)),
                List.<Object[]>of(),
                LocalDate.parse("2026-09-21"), LocalDate.parse("2026-09-22"));

        assertThat(day(days, "2026-09-22").pageViews()).isEqualTo(5);
        assertThat(day(days, "2026-09-21").pageViews()).isZero();
    }

    @Test
    void eveningEventStaysInTheSameMoscowDay() {
        // 20:30 UTC — это 23:30 по Москве, те же сутки: момент по другую
        // сторону границы, чтобы сторож ловил сдвиг в обе стороны, а не
        // только «ночь уехала во вчера».
        List<SiteDayPoint> days = SiteStatsService.fold(
                List.<Object[]>of(hour("2026-09-21T20:30:00Z", "page_view", "desktop", "en", "", 3)),
                List.<Object[]>of(),
                LocalDate.parse("2026-09-21"), LocalDate.parse("2026-09-22"));

        assertThat(day(days, "2026-09-21").pageViews()).isEqualTo(3);
        assertThat(day(days, "2026-09-22").pageViews()).isZero();
    }

    @Test
    void sessionCountsOnceOnTheDayItStarted() {
        // Вкладка живёт часами и попала бы в каждый час, если считать
        // COUNT(DISTINCT) по часам. Сессия относится к суткам ПЕРВОГО события.
        List<SiteDayPoint> days = SiteStatsService.fold(
                List.<Object[]>of(),
                List.<Object[]>of(session("s1", "2026-09-21T20:00:00Z"), session("s2", "2026-09-21T23:30:00Z")),
                LocalDate.parse("2026-09-21"), LocalDate.parse("2026-09-22"));

        assertThat(day(days, "2026-09-21").sessions()).isEqualTo(1);
        assertThat(day(days, "2026-09-22").sessions()).isEqualTo(1);
    }

    @Test
    void everyDayInTheWindowIsPresentEvenWhenEmpty() {
        // Дыра в графике читается как «сбор сломался», а не как «никто не
        // заходил»: владелец задаёт вопрос не про магазин, а про нас.
        List<SiteDayPoint> days = SiteStatsService.fold(
                List.<Object[]>of(), List.<Object[]>of(),
                LocalDate.parse("2026-09-19"), LocalDate.parse("2026-09-22"));

        assertThat(days).hasSize(4);
        assertThat(days).allSatisfy(d -> assertThat(d.pageViews()).isZero());
        assertThat(days.get(0).date()).isEqualTo(LocalDate.parse("2026-09-19"));
        assertThat(days.get(3).date()).isEqualTo(LocalDate.parse("2026-09-22"));
    }

    @Test
    void breakdownsFollowPageViewsOnly() {
        // Разрез по устройству обязан сходиться с числом просмотров рядом.
        // Если считать его по всем типам, одно посещение с добавлением в
        // корзину попадёт в «мобильные» дважды.
        List<SiteDayPoint> days = SiteStatsService.fold(
                List.<Object[]>of(
                        hour("2026-09-21T10:00:00Z", "page_view", "mobile", "ru", "", 7),
                        hour("2026-09-21T10:00:00Z", "add_to_cart", "mobile", "ru", "", 2),
                        hour("2026-09-21T10:00:00Z", "marketplace_click", "mobile", "ru", "wb", 4)),
                List.<Object[]>of(),
                LocalDate.parse("2026-09-21"), LocalDate.parse("2026-09-21"));

        SiteDayPoint d = day(days, "2026-09-21");
        assertThat(d.pageViews()).isEqualTo(7);
        assertThat(d.byDevice()).containsEntry("mobile", 7L);
        assertThat(d.addToCart()).isEqualTo(2);
        assertThat(d.marketplaceClicks()).isEqualTo(4);
        assertThat(d.byMarketplace()).containsEntry("wb", 4L);
    }

    @Test
    void unknownEventTypeIsIgnoredRatherThanCounted() {
        // checkout_start объявлен в SiteEventTypes, но витрина его не шлёт.
        // Когда начнёт — он не должен молча попасть в просмотры страниц.
        List<SiteDayPoint> days = SiteStatsService.fold(
                List.<Object[]>of(hour("2026-09-21T10:00:00Z", "checkout_start", "mobile", "ru", "", 9)),
                List.<Object[]>of(),
                LocalDate.parse("2026-09-21"), LocalDate.parse("2026-09-21"));

        SiteDayPoint d = day(days, "2026-09-21");
        assertThat(d.pageViews()).isZero();
        assertThat(d.productViews()).isZero();
        assertThat(d.addToCart()).isZero();
    }

    private static Object[] page(String instant, String path, long count) {
        return new Object[]{Timestamp.from(Instant.parse(instant)), path, count};
    }

    @Test
    void pathsLandInTheMoscowDayAndAddUpAcrossHours() {
        // 21.09 23:30 UTC — уже 22.09 по Москве; 22.09 08:00 UTC — тот же день.
        Map<LocalDate, Map<String, Long>> days = SiteStatsService.foldPages(
                List.<Object[]>of(
                        page("2026-09-21T23:30:00Z", "/ru", 2),
                        page("2026-09-22T08:00:00Z", "/ru", 3),
                        page("2026-09-21T20:30:00Z", "/ru", 5)),
                LocalDate.parse("2026-09-21"), LocalDate.parse("2026-09-22"));

        assertThat(days.get(LocalDate.parse("2026-09-22"))).containsEntry("/ru", 5L);
        assertThat(days.get(LocalDate.parse("2026-09-21"))).containsEntry("/ru", 5L);
    }

    // Окно открывается в московскую полночь первых суток. «Сейчас минус N
    // дней» давал огрызок первого дня, а в аналитике день ЗАМЕЩАЕТСЯ —
    // огрызок стёр бы там полную версию.
    @Test
    void theWindowOpensAtMoscowMidnightOfTheFirstDay() {
        SiteEventRepository repo = mock(SiteEventRepository.class);
        SiteStatsService service = new SiteStatsService(repo);
        LocalDate from = LocalDate.parse("2026-09-22");

        service.getDailyStats(from, from);
        service.getDailyPages(from, from);

        Instant midnight = Instant.parse("2026-09-21T21:00:00Z");
        verify(repo).countsByHour(midnight);
        verify(repo).sessionFirstSeen(midnight);
        verify(repo).pageViewsByHour(midnight);
    }

    // ---- метки utm_* для site_daily_sources

    private static Object[] utm(String instant, String query, long count) {
        return new Object[]{Timestamp.from(Instant.parse(instant)), query, count};
    }

    @Test
    void parseUtmKeepsOnlyTheThreeLabelsDecodedLowercasedAndClipped() {
        String longCampaign = "a".repeat(150);
        Map<String, String> utm = SiteStatsService.parseUtm(
                "utm_source=%D0%AF%D0%BD%D0%B4%D0%B5%D0%BA%D1%81&UTM_Medium=+CPC+&utm_campaign=" + longCampaign
                        + "&utm_term=x&gclid=1&utm_source=second");
        assertThat(utm).containsEntry("utm_source", "яндекс")
                .containsEntry("utm_medium", "cpc")
                .containsEntry("utm_campaign", "a".repeat(SiteStatsService.MAX_UTM_VALUE))
                .hasSize(3);
    }

    @Test
    void parseUtmSkipsEmptyValuesAndSurvivesBrokenEncoding() {
        assertThat(SiteStatsService.parseUtm("utm_source=&utm_medium=%E0%A4%A&cat=x"))
                .containsExactly(Map.entry("utm_medium", "%e0%a4%a"));
        assertThat(SiteStatsService.parseUtm(null)).isEmpty();
    }

    @Test
    void foldSourcesGroupsByTripleAcrossHoursOnTheMoscowCalendar() {
        LocalDate from = LocalDate.of(2026, 9, 21);
        LocalDate to = LocalDate.of(2026, 9, 22);
        var byDay = SiteStatsService.foldSources(List.of(
                utm("2026-09-21T10:00:00Z", "utm_source=tg&utm_medium=post", 3),
                utm("2026-09-21T15:00:00Z", "utm_medium=post&utm_source=tg", 2),
                utm("2026-09-21T15:00:00Z", "utm_source=yandex", 7),
                // 21:30Z — это уже 00:30 22.09 по Москве.
                utm("2026-09-21T21:30:00Z", "utm_source=tg&utm_medium=post", 1),
                utm("2026-09-21T11:00:00Z", "cat=dresses", 9)), from, to);

        assertThat(byDay.get(from)).containsExactly(
                new SiteStatsService.UtmRow("yandex", null, null, 7),
                new SiteStatsService.UtmRow("tg", "post", null, 5));
        assertThat(byDay.get(to)).containsExactly(new SiteStatsService.UtmRow("tg", "post", null, 1));
    }

    @Test
    void foldSourcesKeepsDaysWithoutLabelsAsEmptyLists() {
        LocalDate day = LocalDate.of(2026, 9, 21);
        var byDay = SiteStatsService.foldSources(List.of(), day, day.plusDays(2));
        assertThat(byDay).hasSize(3).allSatisfy((d, rows) -> assertThat(rows).isEmpty());
    }

    // Приём (leo_analytics #217) отбивает повтор тройки меток в одном дне.
    // «Yandex» и «yandex» — одна тройка после нижнего регистра: строка одна,
    // просмотры сложены, а не две строки с отказом всего дня.
    @Test
    void labelsDifferingOnlyInCaseFoldIntoOneRow() {
        LocalDate day = LocalDate.of(2026, 9, 24);
        var byDay = SiteStatsService.foldSources(List.of(
                utm("2026-09-24T10:00:00Z", "utm_source=Yandex&utm_medium=CPC", 2),
                utm("2026-09-24T11:00:00Z", "utm_source=yandex&utm_medium=cpc", 3)), day, day);
        assertThat(byDay.get(day)).containsExactly(new SiteStatsService.UtmRow("yandex", "cpc", null, 5));
    }

    // Предел приёма — 100 символов (кодовых точек). Эмодзи на границе не
    // рвётся пополам.
    @Test
    void clippingCountsCharactersNotUtf16Units() {
        String campaign = "a".repeat(99) + "😀😀";
        String clipped = SiteStatsService.parseUtm("utm_campaign=" + java.net.URLEncoder.encode(campaign, java.nio.charset.StandardCharsets.UTF_8))
                .get("utm_campaign");
        assertThat(clipped.codePointCount(0, clipped.length())).isEqualTo(100);
        assertThat(clipped).endsWith("😀");
        assertThat(Character.isHighSurrogate(clipped.charAt(clipped.length() - 1))).isFalse();
    }
}
