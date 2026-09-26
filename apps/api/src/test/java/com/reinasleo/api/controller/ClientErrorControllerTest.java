package com.reinasleo.api.controller;

import com.reinasleo.api.errors.AppErrorCollector;
import com.reinasleo.api.errors.ScheduledErrorReporting;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.task.ThreadPoolTaskSchedulerCustomizer;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.web.servlet.HandlerMapping;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Ошибки сайта доходят до сборщика (AppErrorCollector) из всех трёх мест:
 * браузер и серверный рендер Next — через POST /api/client-errors; сам API —
 * через RestExceptionHandler; упавшие @Scheduled — через обработчик
 * планировщика. Отправку в аналитику сторожит AppErrorCollectorTest.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ClientErrorControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ThreadPoolTaskSchedulerCustomizer schedulerCustomizer;
    @MockBean private AppErrorCollector collector;

    private static final String ONE = "{\"events\":[{\"kind\":\"window_error\",\"errorClass\":\"TypeError\","
            + "\"message\":\"x is undefined\",\"frames\":[\"/_next/static/chunks/app.js:1:200\"],"
            + "\"route\":\"/ru/product/[slug]\",\"browser\":\"Safari 18\",\"count\":2}]}";

    private ResultActions send(String body, String realIp) throws Exception {
        var req = post("/api/client-errors").contentType(MediaType.APPLICATION_JSON).content(body);
        if (realIp != null) req.header("X-Real-IP", realIp);
        return mockMvc.perform(req);
    }

    @Test
    void aBrowserErrorArrivesAsSiteWebClient() throws Exception {
        send(ONE, "203.0.113.10").andExpect(status().isAccepted());

        ArgumentCaptor<AppErrorCollector.AppError> sent = ArgumentCaptor.forClass(AppErrorCollector.AppError.class);
        verify(collector).record(sent.capture());
        assertThat(sent.getValue().app()).isEqualTo("site-web-client");
        assertThat(sent.getValue().kind()).isEqualTo("window_error");
        assertThat(sent.getValue().count()).isEqualTo(2);
        assertThat(sent.getValue().route()).isEqualTo("/ru/product/[slug]");
    }

    // Next ходит по loopback без nginx — без X-Real-IP. Только такой запрос
    // сервер считает серверным рендером, что бы ни стояло в теле.
    @Test
    void theNextServerIsRecognisedByTheConnectionNotByTheBody() throws Exception {
        String render = ONE.replace("window_error", "render");
        send(render, null).andExpect(status().isAccepted());

        ArgumentCaptor<AppErrorCollector.AppError> sent = ArgumentCaptor.forClass(AppErrorCollector.AppError.class);
        verify(collector).record(sent.capture());
        assertThat(sent.getValue().app()).isEqualTo("site-web-server");
    }

    @Test
    void theServerCannotSendBrowserKinds() throws Exception {
        send(ONE, null).andExpect(status().isAccepted());
        verify(collector, never()).record(any());
    }

    @Test
    void oneAddressIsLimitedToTwentyBatchesAMinute() throws Exception {
        for (int i = 0; i < 20; i++) send(ONE, "198.51.100.7").andExpect(status().isAccepted());
        send(ONE, "198.51.100.7").andExpect(status().isTooManyRequests());
        // Соседний адрес лимит не задевает.
        send(ONE, "198.51.100.8").andExpect(status().isAccepted());
    }

    @Test
    void anOversizedBatchIsRefused() throws Exception {
        String big = "{\"events\":[" + String.join(",", java.util.Collections.nCopies(20,
                "{\"kind\":\"window_error\",\"message\":\"" + "a ".repeat(900) + "\"}")) + "]}";
        send(big, "192.0.2.44").andExpect(status().isPayloadTooLarge());
        verify(collector, never()).record(any());
    }

    @Test
    void anUnhandledApiExceptionIsRecordedWithTheRouteTemplate() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/orders/42");
        request.setAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE, "/api/orders/{id}");
        RuntimeException ex = new IllegalStateException("boom");

        new RestExceptionHandler(collector).handleGeneric(ex, request);

        verify(collector).recordThrowable("exception", ex, "GET", "/api/orders/{id}", 500);
    }

    @Test
    void aFailedScheduledTaskIsRecorded() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        schedulerCustomizer.customize(scheduler);
        scheduler.initialize();
        try {
            RuntimeException ex = new IllegalStateException("publisher broke");
            scheduler.schedule(() -> { throw ex; }, Instant.now());
            verify(collector, timeout(2000)).recordThrowable(eq("scheduled"), eq(ex), isNull(), isNull(), isNull());
        } finally {
            scheduler.shutdown();
        }
    }
}
