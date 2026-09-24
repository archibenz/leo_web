package com.reinasleo.api.repository;

import com.reinasleo.api.model.SiteEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface SiteEventRepository extends JpaRepository<SiteEvent, UUID> {

    List<SiteEvent> findByUserIdOrderByOccurredAtDesc(UUID userId);

    // Soft-delete keeps the users row (anonymised, not removed), so the FK's
    // ON DELETE SET NULL never fires on its own — deleteAccount() calls this
    // explicitly, the same way it wipes cart_items/favorites. The row itself
    // stays (it is a historical analytics fact), only the identity link goes.
    //
    // flushAutomatically is required, not optional: deleteAccount() mutates
    // the managed User entity (setDeletedAt etc.) BEFORE calling this, and a
    // bulk UPDATE only auto-flushes pending changes for entities it directly
    // targets (SiteEvent here, not User) — without it, entityManager.clear()
    // below silently drops the still-unflushed User changes. Caught by
    // AuthControllerDeleteTest: deletedAt came back null after this call.
    // clearAutomatically: a bulk UPDATE bypasses the persistence context, so
    // without this an entity loaded earlier in the same transaction (e.g. a
    // test that saves, clears, then re-reads) would still show the stale
    // in-memory value even though the row changed.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE SiteEvent e SET e.userId = null WHERE e.userId = :userId")
    int clearUserId(@Param("userId") UUID userId);

    // Посещения — это покупатели. Из всех трёх запросов ниже убраны свои:
    //  - страницы админки: по пути, потому что это единственный признак у
    //    старых строк (с 13.09 по 24.09 админка писала page_view наравне с
    //    витриной и дала пятую часть всех просмотров). Трекер витрины их
    //    больше не шлёт, фильтр здесь — ради накопленного;
    //  - любые события вошедших администраторов, по роли, а не по пути:
    //    личный кабинет открывают и покупатели, и владелец, и по адресу их не
    //    различить. Роль отсекает владельца и на витрине.
    // Не отсекается владелец, не вошедший в учётку: признака у такого
    // события нет никакого.
    String CUSTOMERS_ONLY = """
             AND (e.path IS NULL OR (e.path NOT LIKE '/admin%' AND e.path NOT LIKE '/__/admin'
                  AND e.path NOT LIKE '/__/admin/%' AND e.path NOT LIKE '/__/admin?%'))
             AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = e.user_id AND u.role = 'admin')
            """;

    // СУТКИ ЗДЕСЬ НЕ СЧИТАЮТСЯ — И ЭТО НЕ ЛЕНЬ.
    //
    // Витрине нужны московские сутки, а группировать по ним в SQL в этом
    // проекте нельзя проверкой: тесты идут на H2, и он ПРИНИМАЕТ
    // `AT TIME ZONE 'Europe/Moscow'`, но не сдвигает. Замерено 21.09.2026 на
    // событии 2026-09-21T23:30:00Z (по Москве это уже 22-е): при
    // user.timezone=UTC и «по Москве», и «без зоны» дали 21-е. Проверка на
    // такой связке была бы ЗЕЛЁНОЙ при неверном ответе — хуже, чем отказ.
    // Соседний findRegistrationsByDayAfter с `DATE(... AT TIME ZONE 'UTC')`
    // на H2 не исполняется вовсе («Function DATE not found»), и потому не
    // имеет ни одной проверки. Разбор и решение — в lw-1h34.
    //
    // Поэтому запросы отдают величины, от часового пояса НЕ зависящие, а
    // календарь живёт в SiteStatsService, где проверяется обычным юнит-тестом
    // без базы. Час выбран зерном сознательно: смещение Москвы — целые часы,
    // поэтому час однозначно ложится в сутки любой из зон.
    // bucket_hour, а не hour: `hour` — зарезервированное слово, и запрос с
    // таким алиасом не готовится вовсе. Компилятор нативный SQL не смотрит,
    // поймал это AdminSiteStatsControllerTest — тем, что реально сходил в базу.
    @Query(value = """
            SELECT date_trunc('hour', occurred_at) AS bucket_hour,
                   event_type,
                   COALESCE(device, '') AS device,
                   COALESCE(locale, '') AS locale,
                   COALESCE(marketplace, '') AS marketplace,
                   COUNT(*) AS cnt
            FROM site_events e
            WHERE occurred_at >= :since
            """ + CUSTOMERS_ONLY + """
            GROUP BY 1, 2, 3, 4, 5
            ORDER BY 1
            """, nativeQuery = true)
    List<Object[]> countsByHour(@Param("since") Instant since);

    // Уникальные сессии за сутки НЕЛЬЗЯ сложить из часовых COUNT(DISTINCT):
    // одна вкладка живёт несколько часов и посчиталась бы в каждом. Поэтому
    // сессия отдаётся одной строкой с моментом ПЕРВОГО появления, а к суткам
    // её относит сервис — по тому же московскому календарю, что и всё
    // остальное.
    @Query(value = """
            SELECT session_key, MIN(occurred_at) AS first_seen
            FROM site_events e
            WHERE occurred_at >= :since AND session_key IS NOT NULL
            """ + CUSTOMERS_ONLY + """
            GROUP BY session_key
            """, nativeQuery = true)
    List<Object[]> sessionFirstSeen(@Param("since") Instant since);

    // Топ страниц — за весь период, без разреза по суткам: владельцу нужен
    // ответ «что смотрят», а не «что смотрели во вторник».
    @Query(value = """
            SELECT path, COUNT(*) AS cnt
            FROM site_events e
            WHERE occurred_at >= :since AND event_type = 'page_view' AND path IS NOT NULL
            """ + CUSTOMERS_ONLY + """
            GROUP BY path
            ORDER BY cnt DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<Object[]> topPaths(@Param("since") Instant since, @Param("limit") int limit);
}
