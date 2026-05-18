package com.reinasleo.api.config;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

class RateLimitFilterTest {

    private static final String METRIC = "reinasleo.rate_limit.hit";

    private MeterRegistry meterRegistry;
    private RateLimitFilter filter;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        filter = new RateLimitFilter(meterRegistry);
    }

    private double hits(String bucket) {
        return meterRegistry.counter(METRIC, "bucket", bucket).count();
    }

    private HttpServletRequest req(String path, String method) {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRequestURI(path);
        req.setMethod(method);
        req.addHeader("X-Real-IP", "203.0.113.7");
        return req;
    }

    @Test
    void authBucketExhausted_429AndCounterIncrements() throws Exception {
        FilterChain chain = mock(FilterChain.class);

        // Burst until /api/auth/ bucket is empty (limit = 10/min).
        for (int i = 0; i < 10; i++) {
            filter.doFilter(req("/api/auth/login", "POST"), new MockHttpServletResponse(), chain);
        }
        verify(chain, times(10)).doFilter(any(ServletRequest.class), any(ServletResponse.class));
        assertThat(hits("auth")).isZero();

        // 11th call exceeds the bucket — counter ticks once, chain not invoked further.
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req("/api/auth/login", "POST"), res, chain);

        verify(chain, times(10)).doFilter(any(ServletRequest.class), any(ServletResponse.class));
        assertThat(res.getStatus()).isEqualTo(429);
        assertThat(hits("auth")).isEqualTo(1.0);
        assertThat(hits("bot")).isZero();
        assertThat(hits("contact")).isZero();
    }

    @Test
    void contactBucketExhausted_incrementsContactCounter() throws Exception {
        FilterChain chain = mock(FilterChain.class);

        // contact limit = 3/min.
        for (int i = 0; i < 3; i++) {
            filter.doFilter(req("/api/contact", "POST"), new MockHttpServletResponse(), chain);
        }
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req("/api/contact", "POST"), res, chain);

        assertThat(res.getStatus()).isEqualTo(429);
        assertThat(hits("contact")).isEqualTo(1.0);
    }

    @Test
    void unmatchedPath_isPassedThroughAndDoesNotTickAnyCounter() throws Exception {
        FilterChain chain = mock(FilterChain.class);
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req("/api/products", "GET"), res, chain);

        verify(chain, times(1)).doFilter(any(ServletRequest.class), any(ServletResponse.class));
        assertThat(hits("auth")).isZero();
        assertThat(hits("bot")).isZero();
        assertThat(hits("contact")).isZero();
    }
}
