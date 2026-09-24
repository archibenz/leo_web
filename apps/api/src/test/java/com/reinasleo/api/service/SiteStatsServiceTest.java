package com.reinasleo.api.service;

import com.reinasleo.api.dto.SiteDayPoint;
import org.junit.jupiter.api.Test;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

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
}
