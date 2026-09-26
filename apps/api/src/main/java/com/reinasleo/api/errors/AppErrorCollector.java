package com.reinasleo.api.errors;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reinasleo.api.service.AnalyticsIngestClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Ошибки сайта → приём аналитики (тип app_error). Сервер сайта в RU до
 * Telegram не достаёт, поэтому тревоги шлёт бот аналитики, а сайт только
 * доставляет ошибки ей.
 *
 * Сюда сходится всё: исключения и 5xx самого API, упавшие @Scheduled-задачи,
 * ошибки серверного рендера Next и браузера (через POST /api/client-errors).
 *
 * СКЛЕЙКА. Повторы одной ошибки — одна группа со счётчиком (ключ app +
 * отпечаток, ErrorFingerprint). Раз в минуту группы уходят пачкой.
 *
 * БУФЕР. Приём недоступен — группы копятся и досылаются следующим прогоном.
 * Потолок 1000 групп; при переполнении выпадает самая старая, а её count
 * уходит отдельным событием app_error_dropped (с когда по когда). Потеря
 * видна, а не тиха: «ноль ошибок» и «ошибки выброшены» не должны выглядеть
 * одинаково.
 *
 * Чего нет в событии: тел запросов, query, заголовков, кук, IP, user_id.
 * Сообщение и кадры — через SecretMask.
 */
@Service
public class AppErrorCollector {

    private static final Logger log = LoggerFactory.getLogger(AppErrorCollector.class);

    static final int MAX_GROUPS = 1000;
    static final int EVENTS_PER_ENVELOPE = 500;
    static final int MAX_MESSAGE = 500;
    static final int MAX_FRAME = 200;
    static final int MAX_FRAMES = 10;
    static final int MAX_CLASS = 200;
    private static final String OUR_PACKAGE = "com.reinasleo.";

    /** Готовая к отправке ошибка. Строки уже замаскированы и обрезаны. */
    public record AppError(String app, String kind, String errorClass, String message, List<String> frames,
                           String route, String method, Integer status, String release, String browser,
                           long count, Instant firstSeen, Instant lastSeen) {}

    private static final class Group {
        final String fingerprint;
        final AppError sample;
        long count;
        Instant firstSeen;
        Instant lastSeen;

        Group(String fingerprint, AppError e) {
            this.fingerprint = fingerprint;
            this.sample = e;
            this.count = e.count();
            this.firstSeen = e.firstSeen();
            this.lastSeen = e.lastSeen();
        }
    }

    private final AnalyticsIngestClient ingest;
    private final String release;
    private final String env;

    // Порядок вставки = возраст группы: при переполнении выпадает самая старая.
    private final LinkedHashMap<String, Group> groups = new LinkedHashMap<>();
    private long dropped;
    private Instant droppedSince;
    private Instant droppedUntil;

    public AppErrorCollector(ObjectMapper json,
                             @Value("${app.analytics.ingest-url}") String url,
                             @Value("${app.analytics.ingest-secret}") String secret,
                             @Value("${app.errors.release:unknown}") String release,
                             @Value("${app.errors.env:dev}") String env) {
        this.ingest = new AnalyticsIngestClient(json, url, secret);
        this.release = release == null || release.isBlank() ? "unknown" : release;
        // Всё, что не «prod», — dev: аналитика прячет dev-группы сразу, и тревог
        // от стенда разработчика владелец не получит.
        this.env = "prod".equalsIgnoreCase(env) ? "prod" : "dev";
    }

    String release() {
        return release;
    }

    /** Исключение в самом API: класс, сообщение и наши кадры стека. */
    public void recordThrowable(String kind, Throwable t, String method, String route, Integer status) {
        try {
            List<String> frames = Arrays.stream(t.getStackTrace())
                    .filter(f -> f.getClassName().startsWith(OUR_PACKAGE))
                    .limit(MAX_FRAMES)
                    .map(f -> simpleName(f.getClassName()) + "." + f.getMethodName() + ":" + f.getLineNumber())
                    .map(f -> SecretMask.maskAndClip(f, MAX_FRAME))
                    .toList();
            Instant now = Instant.now();
            record(new AppError("site-api", kind,
                    SecretMask.maskAndClip(t.getClass().getName(), MAX_CLASS),
                    SecretMask.maskAndClip(t.getMessage() == null ? "" : t.getMessage(), MAX_MESSAGE),
                    frames, route, method, status, release, null, 1, now, now));
        } catch (RuntimeException e) {
            // Сборщик ошибок сам не имеет права ронять обработку ошибки.
            log.warn("Could not record an app error", e);
        }
    }

    public synchronized void record(AppError e) {
        String topFrame = e.frames() == null || e.frames().isEmpty() ? "" : e.frames().get(0);
        String fingerprint = ErrorFingerprint.of(e.app(), e.kind(), e.errorClass(), e.message(), topFrame);
        String key = e.app() + ":" + fingerprint;
        Group g = groups.get(key);
        if (g != null) {
            g.count += e.count();
            if (e.firstSeen().isBefore(g.firstSeen)) g.firstSeen = e.firstSeen();
            if (e.lastSeen().isAfter(g.lastSeen)) g.lastSeen = e.lastSeen();
            return;
        }
        if (groups.size() >= MAX_GROUPS) {
            Iterator<Map.Entry<String, Group>> it = groups.entrySet().iterator();
            Group eldest = it.next().getValue();
            it.remove();
            noteDropped(eldest.count, eldest.firstSeen, eldest.lastSeen);
        }
        groups.put(key, new Group(fingerprint, e));
    }

    private void noteDropped(long count, Instant since, Instant until) {
        dropped += count;
        if (droppedSince == null || since.isBefore(droppedSince)) droppedSince = since;
        if (droppedUntil == null || until.isAfter(droppedUntil)) droppedUntil = until;
    }

    synchronized int size() {
        return groups.size();
    }

    synchronized long droppedCount() {
        return dropped;
    }

    @Scheduled(fixedDelayString = "${app.errors.flush-ms:60000}", initialDelayString = "${app.errors.flush-ms:60000}")
    public void flush() {
        if (!ingest.enabled()) return;

        List<Group> batch;
        long droppedNow;
        Instant since;
        Instant until;
        synchronized (this) {
            if (groups.isEmpty() && dropped == 0) return;
            batch = new ArrayList<>(groups.values());
            groups.clear();
            droppedNow = dropped;
            since = droppedSince;
            until = droppedUntil;
            dropped = 0;
            droppedSince = null;
            droppedUntil = null;
        }

        Instant stamp = Instant.now();
        long run = stamp.toEpochMilli();
        List<Map<String, Object>> events = new ArrayList<>(batch.stream().map(this::event).toList());
        if (droppedNow > 0) {
            Map<String, Object> d = new LinkedHashMap<>();
            d.put("type", "app_error_dropped");
            d.put("count", droppedNow);
            d.put("since", since.toString());
            d.put("until", until.toString());
            events.add(d);
        }

        for (int i = 0, chunk = 1; i < events.size(); i += EVENTS_PER_ENVELOPE, chunk++) {
            List<Map<String, Object>> part = events.subList(i, Math.min(i + EVENTS_PER_ENVELOPE, events.size()));
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("source", "site");
            body.put("captured_at", stamp.toString());
            body.put("events", part);
            String failure = ingest.send("app_errors:" + run + ":" + chunk, body);
            if (failure != null) {
                log.warn("App errors → analytics failed ({}); keeping {} events for the next run", failure, part.size());
                putBack(batch, i, part.size(), droppedNow, since, until);
            }
        }
    }

    // Не дошедший кусок возвращается в буфер: группы — как были (склеятся с
    // новыми), счётчик выброшенного — тоже. Возврат может сам переполнить
    // буфер; тогда выпавшее честно уйдёт в dropped.
    private synchronized void putBack(List<Group> batch, int from, int size, long droppedNow, Instant since, Instant until) {
        int end = Math.min(from + size, batch.size());
        for (int i = from; i < end; i++) {
            Group g = batch.get(i);
            AppError s = g.sample;
            record(new AppError(s.app(), s.kind(), s.errorClass(), s.message(), s.frames(), s.route(), s.method(),
                    s.status(), s.release(), s.browser(), g.count, g.firstSeen, g.lastSeen));
        }
        // Событие dropped идёт последним и попадает в последний кусок.
        if (droppedNow > 0 && from + size > batch.size()) {
            noteDropped(droppedNow, since, until);
        }
    }

    private Map<String, Object> event(Group g) {
        AppError s = g.sample;
        Map<String, Object> ev = new LinkedHashMap<>();
        ev.put("type", "app_error");
        ev.put("fingerprint", g.fingerprint);
        ev.put("app", s.app());
        ev.put("kind", s.kind());
        ev.put("error_class", s.errorClass());
        ev.put("message", s.message());
        ev.put("frames", s.frames() == null ? List.of() : s.frames());
        ev.put("route", s.route());
        ev.put("method", s.method());
        ev.put("status", s.status());
        ev.put("count", g.count);
        ev.put("first_seen", g.firstSeen.toString());
        ev.put("last_seen", g.lastSeen.toString());
        ev.put("release", s.release() == null ? release : s.release());
        ev.put("env", env);
        ev.put("browser", s.browser());
        return ev;
    }

    private static String simpleName(String className) {
        int dot = className.lastIndexOf('.');
        return dot < 0 ? className : className.substring(dot + 1);
    }
}
