package com.reinasleo.api.config;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import static org.assertj.core.api.Assertions.assertThat;

class AnalyticsIdentityRateLimitTest {
    @ParameterizedTest
    @CsvSource({
            "/api/auth/analytics-session, POST",
            "/api/auth/analytics-session, HEAD",
            "/api/auth/analytics-session/, GET",
            "/api/auth/me, GET",
            "/api/auth/login, POST"
    })
    void identityAllowanceDoesNotRelaxOtherAuthPathsOrMethods(String path, String method) throws Exception {
        var filter = new RateLimitFilter(new SimpleMeterRegistry(), 10);
        for (int attempt = 0; attempt < 11; attempt++) {
            var request = new MockHttpServletRequest(method, path);
            request.setRemoteAddr("192.0.2.41");
            var response = new MockHttpServletResponse();
            filter.doFilter(request, response, (req, res) -> ((MockHttpServletResponse) res).setStatus(204));
            assertThat(response.getStatus()).isEqualTo(attempt < 10 ? 204 : 429);
        }
        var identity = new MockHttpServletRequest("GET", "/api/auth/analytics-session");
        identity.setRemoteAddr("192.0.2.41");
        var response = new MockHttpServletResponse();
        filter.doFilter(identity, response, (req, res) -> ((MockHttpServletResponse) res).setStatus(204));
        assertThat(response.getStatus()).isEqualTo(204);
    }
}
