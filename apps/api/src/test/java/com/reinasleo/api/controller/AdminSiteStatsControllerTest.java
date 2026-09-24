package com.reinasleo.api.controller;

import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.SiteEventRepository;
import com.reinasleo.api.repository.UserRepository;
import com.reinasleo.api.security.JwtService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Две новые двери к site_events. Проверяем ровно две вещи, которые нельзя
 * проверить нигде больше:
 *
 * 1. ЗАПРОСЫ ИСПОЛНЯЮТСЯ. Нативный SQL компилятор не проверяет: соседний
 *    findRegistrationsByDayAfter пролежал в проекте с функцией, которой в
 *    тестовой базе нет, и никто не узнал (lw-1h34). Здесь ручка вызывается
 *    по-настоящему, до самой базы.
 * 2. ЧУЖОЙ НЕ ВОЙДЁТ. Посещаемость магазина — не публичная величина.
 *
 * Арифметика суток проверяется отдельно и без базы: SiteStatsServiceTest.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminSiteStatsControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository users;
    @Autowired private SiteEventRepository siteEvents;
    @Autowired private JwtService jwtService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private EntityManager em;
    @Autowired private PlatformTransactionManager txManager;

    // Сам тест транзакции НЕ держит — иначе фильтр безопасности читает
    // пользователя вне неё и не видит его (админ получал 403). Но нативные
    // INSERT/DELETE транзакцию требуют, поэтому она открывается точечно
    // вокруг данных и закрывается до запроса.
    private TransactionTemplate tx;

    private String adminToken;
    private String customerToken;

    @BeforeEach
    void setUp() {
        tx = new TransactionTemplate(txManager);
        adminToken = tokenFor("stats-admin@test.dev", "admin");
        customerToken = tokenFor("stats-buyer@test.dev", "user");

        // Вставляем напрямую: у модели нет сеттера на occurred_at (его ставит
        // @PrePersist), а нам нужен заданный момент, а не «сейчас».
        tx.executeWithoutResult(status -> {
            event("page_view", "2026-09-21T10:00:00Z", "mobile", "ru", null, "/ru", "s-1");
            event("page_view", "2026-09-21T11:00:00Z", "desktop", "en", null, "/en", "s-2");
            event("marketplace_click", "2026-09-21T12:00:00Z", "mobile", "ru", "wb", "/ru", "s-1");
        });
    }

    private void event(String type, String at, String device, String locale, String marketplace, String path, String session) {
        em.createNativeQuery("""
                INSERT INTO site_events (id, event_type, occurred_at, device, locale, marketplace, path, session_key)
                VALUES (?1, ?2, TIMESTAMP WITH TIME ZONE '""" + at.replace("T", " ").replace("Z", "+00") + """
                ', ?3, ?4, ?5, ?6, ?7)""")
                .setParameter(1, UUID.randomUUID())
                .setParameter(2, type)
                .setParameter(3, device)
                .setParameter(4, locale)
                .setParameter(5, marketplace)
                .setParameter(6, path)
                .setParameter(7, session)
                .executeUpdate();
    }

    // Событие «только что», с учёткой или без: окно ручек считается от
    // текущего момента, и дата из прошлого в него со временем перестанет попадать.
    private void recentEvent(String path, String session, UUID userId) {
        em.createNativeQuery("""
                INSERT INTO site_events (id, event_type, occurred_at, device, locale, path, session_key, user_id)
                VALUES (?1, 'page_view', ?2, 'mobile', 'ru', ?3, ?4, ?5)""")
                .setParameter(1, UUID.randomUUID())
                .setParameter(2, java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC).minusMinutes(30))
                .setParameter(3, path)
                .setParameter(4, session)
                .setParameter(5, userId)
                .executeUpdate();
    }

    private UUID idOf(String email) {
        return users.findByEmailIgnoreCase(email).orElseThrow().getId();
    }

    private void seedStaffAndCustomers() {
        UUID admin = idOf("stats-admin@test.dev");
        UUID buyer = idOf("stats-buyer@test.dev");
        tx.executeWithoutResult(status -> {
            recentEvent("/ru/shop-t", "s-3", null);            // аноним на витрине — считается
            recentEvent("/ru/admin", "s-4", null);             // админка без учётки — по пути
            recentEvent("/ru/admin/products", "s-4", null);
            recentEvent("/ru/account", "s-5", buyer);          // покупатель в кабинете — считается
            recentEvent("/ru/shop-owner", "s-6", admin);       // владелец на витрине — по роли
        });
    }

    private String tokenFor(String email, String role) {
        User user = new User(email, "Имя", "Фамилия", passwordEncoder.encode("Sup3rSecret!"),
                LocalDate.of(1990, 1, 1), false, true);
        user.setRole(role);
        user = users.save(user);
        return jwtService.generateToken(user.getId(), user.getEmail());
    }

    @AfterEach
    void tearDown() {
        // База в тестах одна на весь прогон (H2 in-memory, DB_CLOSE_DELAY=-1).
        // Без транзакции свои строки надо унести самому, иначе они достанутся
        // соседнему тесту, который считает события.
        tx.executeWithoutResult(status -> {
            em.createNativeQuery("DELETE FROM site_events WHERE session_key IN ('s-1','s-2','s-3','s-4','s-5','s-6','s-7')").executeUpdate();
            users.findByEmailIgnoreCase("stats-admin@test.dev").ifPresent(users::delete);
            users.findByEmailIgnoreCase("stats-buyer@test.dev").ifPresent(users::delete);
        });
    }

    @Test
    void dailyStatsRunAgainstTheDatabase() throws Exception {
        mockMvc.perform(get("/api/admin/stats/site-daily").param("days", "7")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].date").exists())
                .andExpect(jsonPath("$[0].pageViews").exists());
    }

    @Test
    void topPathsRunAgainstTheDatabase() throws Exception {
        mockMvc.perform(get("/api/admin/stats/site-paths").param("days", "7").param("limit", "5")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // Посещения — это покупатели. Админка (по пути) и любые события
    // вошедшего администратора (по роли) не считаются ни в одном из трёх
    // запросов; покупатель в личном кабинете — считается.
    @Test
    void topPathsCountCustomersNotStaff() throws Exception {
        seedStaffAndCustomers();
        mockMvc.perform(get("/api/admin/stats/site-paths").param("days", "1").param("limit", "50")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].path", hasItem("/ru/shop-t")))
                .andExpect(jsonPath("$[*].path", hasItem("/ru/account")))
                .andExpect(jsonPath("$[*].path", not(hasItem("/ru/admin"))))
                .andExpect(jsonPath("$[*].path", not(hasItem("/ru/admin/products"))))
                .andExpect(jsonPath("$[*].path", not(hasItem("/ru/shop-owner"))));
    }

    // Накопленные до 24.09 строки несут строку запроса целиком. Топ страниц
    // обязан складывать их в один адрес — иначе /ru/shop?cat=… и /ru/shop
    // делят просмотры между собой, и ни один не выглядит популярным.
    @Test
    void topPathsFoldQueryStringsIntoOneAddress() throws Exception {
        tx.executeWithoutResult(status -> {
            recentEvent("/ru/shop-q", "s-7", null);
            recentEvent("/ru/shop-q?cat=dresses", "s-7", null);
            recentEvent("/ru/shop-q?utm_source=tg", "s-7", null);
        });
        mockMvc.perform(get("/api/admin/stats/site-paths").param("days", "1").param("limit", "50")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.path =~ /\\/ru\\/shop-q.*/)].path", contains("/ru/shop-q")))
                .andExpect(jsonPath("$[?(@.path == '/ru/shop-q')].views", contains(3)));
    }

    @Test
    void sessionsAndHourlyCountsSkipStaff() {
        seedStaffAndCustomers();
        Instant since = Instant.now().minus(2, ChronoUnit.HOURS);

        Set<String> sessions = siteEvents.sessionFirstSeen(since).stream()
                .map(row -> (String) row[0]).collect(Collectors.toSet());
        assertThat(sessions).contains("s-3", "s-5").doesNotContain("s-4", "s-6");

        List<Object[]> hourly = siteEvents.countsByHour(since);
        long pageViews = hourly.stream().filter(row -> "page_view".equals(row[1]))
                .mapToLong(row -> ((Number) row[5]).longValue()).sum();
        assertThat(pageViews).isEqualTo(2);
    }

    @Test
    void aCustomerCannotReadHowBusyTheShopIs() throws Exception {
        mockMvc.perform(get("/api/admin/stats/site-daily")
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void aStrangerCannotReadHowBusyTheShopIs() throws Exception {
        mockMvc.perform(get("/api/admin/stats/site-paths"))
                .andExpect(status().isForbidden());
    }
}
