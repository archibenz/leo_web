package com.reinasleo.api.controller;

import com.reinasleo.api.dto.BotVisitStatPoint;
import com.reinasleo.api.dto.DashboardResponse;
import com.reinasleo.api.dto.RecentOrderResponse;
import com.reinasleo.api.dto.RegistrationStatPoint;
import com.reinasleo.api.dto.SiteDayPoint;
import com.reinasleo.api.dto.SitePathPoint;
import com.reinasleo.api.dto.StockAlertResponse;
import com.reinasleo.api.dto.TopProductPoint;
import com.reinasleo.api.service.AdminProductService;
import com.reinasleo.api.service.SiteDailyPublisher;
import com.reinasleo.api.service.SiteStatsService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminDashboardController {

    private final AdminProductService adminProductService;
    private final SiteStatsService siteStatsService;
    private final SiteDailyPublisher siteDailyPublisher;

    public AdminDashboardController(AdminProductService adminProductService, SiteStatsService siteStatsService,
                                    SiteDailyPublisher siteDailyPublisher) {
        this.adminProductService = adminProductService;
        this.siteStatsService = siteStatsService;
        this.siteDailyPublisher = siteDailyPublisher;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<DashboardResponse> dashboard() {
        return ResponseEntity.ok(adminProductService.getDashboard());
    }

    @GetMapping("/alerts")
    public ResponseEntity<List<StockAlertResponse>> alerts() {
        return ResponseEntity.ok(adminProductService.getAlerts());
    }

    @GetMapping("/orders/recent")
    public ResponseEntity<List<RecentOrderResponse>> recentOrders() {
        return ResponseEntity.ok(adminProductService.getRecentOrders());
    }

    @GetMapping("/stats/registrations")
    public ResponseEntity<List<RegistrationStatPoint>> registrationStats(
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(adminProductService.getRegistrationStats(days));
    }

    @GetMapping("/stats/bot-visits")
    public ResponseEntity<List<BotVisitStatPoint>> botVisitStats(
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(adminProductService.getBotVisitStats(days));
    }

    // Посещения витрины. Таблица site_events наполнялась с 13.09.2026, а
    // прочитать её было нечем: ни одной агрегации в репозитории, ни одной
    // ручки здесь. Сутки режутся ПО МОСКВЕ — почему именно так и чем это
    // отличается от соседних карточек, написано в SiteStatsService.
    @GetMapping("/stats/site-daily")
    public ResponseEntity<List<SiteDayPoint>> siteDaily(
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(siteStatsService.getDailyStats(days));
    }

    @GetMapping("/stats/site-paths")
    public ResponseEntity<List<SitePathPoint>> sitePaths(
            @RequestParam(defaultValue = "30") int days,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(siteStatsService.getTopPaths(days, limit));
    }

    // Доливка дневных чисел в аналитику за последние N суток — для первого
    // запуска (события копятся с 13.09) и после простоя приёма. По расписанию
    // отправитель шлёт только вчера и сегодня. Код ответа — исход, а не
    // «запрос принят»: 503 — отправка не настроена, 502 — часть конвертов
    // не принята (список в теле).
    @PostMapping("/stats/site-daily/publish")
    public ResponseEntity<SiteDailyPublisher.Result> publishSiteDaily(
            @RequestParam(defaultValue = "2") int days) {
        int safeDays = Math.max(1, Math.min(days, 90));
        LocalDate today = SiteStatsService.today();
        SiteDailyPublisher.Result result = siteDailyPublisher.publish(today.minusDays(safeDays - 1L), today);
        HttpStatus status = !result.enabled() ? HttpStatus.SERVICE_UNAVAILABLE
                : result.failed() > 0 ? HttpStatus.BAD_GATEWAY
                : HttpStatus.OK;
        return ResponseEntity.status(status).body(result);
    }

    @GetMapping("/stats/top-products")
    public ResponseEntity<List<TopProductPoint>> topProducts(
            @RequestParam(defaultValue = "add_to_favorite") String eventType,
            @RequestParam(defaultValue = "30") int days,
            @RequestParam(defaultValue = "5") int limit) {
        return ResponseEntity.ok(adminProductService.getTopProducts(eventType, days, limit));
    }

    @PostMapping("/alerts/{id}/acknowledge")
    public ResponseEntity<Void> acknowledgeAlert(@PathVariable UUID id) {
        adminProductService.acknowledgeAlert(id);
        return ResponseEntity.ok().build();
    }

}
