package com.reinasleo.api.config;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class TelegramLinkStatusRateLimitTest {
    private final SimpleMeterRegistry meters = new SimpleMeterRegistry();
    private final RateLimitFilter filter = new RateLimitFilter(meters, 10);
    private final FilterChain chain = mock(FilterChain.class);

    private MockHttpServletResponse request(String path, String method) throws Exception {
        var request = new MockHttpServletRequest(method, path);
        request.setRemoteAddr("192.0.2.41");
        var response = new MockHttpServletResponse();
        filter.doFilter(request, response, chain);
        return response;
    }

    @Test
    void thirtyPollsHaveSeparateAllowanceAndTheNextRequestBacksOff() throws Exception {
        for (int attempt = 0; attempt < 30; attempt++) {
            assertThat(request("/api/auth/me/telegram-link/status", "GET").getStatus()).isEqualTo(200);
        }
        var denied = request("/api/auth/me/telegram-link/status", "GET");
        assertThat(denied.getStatus()).isEqualTo(429);
        assertThat(Integer.parseInt(denied.getHeader("Retry-After"))).isPositive();
        verify(chain, times(30)).doFilter(any(), any());
        assertThat(meters.counter("reinasleo.rate_limit.hit", "bucket", "telegram_link_status").count()).isEqualTo(1);
        for (int attempt = 0; attempt < 10; attempt++) {
            assertThat(request("/api/auth/login", "POST").getStatus()).isEqualTo(200);
        }
        assertThat(request("/api/auth/login", "POST").getStatus()).isEqualTo(429);
    }

    @ParameterizedTest
    @CsvSource({
            "/api/auth/me/telegram-link/status, POST",
            "/api/auth/me/telegram-link/status, HEAD",
            "/api/auth/me/telegram-link/status/, GET",
            "/api/auth/me/telegram-link/challenge, POST",
            "/api/auth/me, GET"
    })
    void neighboringPathsAndOtherMethodsKeepTheAuthLimit(String path, String method) throws Exception {
        for (int attempt = 0; attempt < 10; attempt++) request(path, method);
        assertThat(request(path, method).getStatus()).isEqualTo(429);
        assertThat(meters.counter("reinasleo.rate_limit.hit", "bucket", "auth").count()).isEqualTo(1);
        assertThat(request("/api/auth/me/telegram-link/status", "GET").getStatus()).isEqualTo(200);
    }
}
