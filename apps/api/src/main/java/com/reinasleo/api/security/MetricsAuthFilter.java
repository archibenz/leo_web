package com.reinasleo.api.security;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

@Component
public class MetricsAuthFilter extends OncePerRequestFilter {

    private static final String METRICS_PATH = "/actuator/prometheus";
    private static final String HEADER = "X-Metrics-Secret";

    @Value("${app.metrics.secret}")
    private String metricsSecret;

    @PostConstruct
    void validateMetricsSecretConfigured() {
        if (metricsSecret == null || metricsSecret.isBlank()) {
            throw new IllegalStateException(
                    "METRICS_SECRET env var is required — refusing to start. "
                            + "An empty value would expose /actuator/prometheus to any caller.");
        }
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        if (METRICS_PATH.equals(request.getRequestURI())) {
            String provided = request.getHeader(HEADER);
            if (provided != null && MessageDigest.isEqual(
                    provided.getBytes(StandardCharsets.UTF_8),
                    metricsSecret.getBytes(StandardCharsets.UTF_8))) {
                var auth = new UsernamePasswordAuthenticationToken(
                        "metrics-scraper", null,
                        List.of(new SimpleGrantedAuthority("ROLE_METRICS")));
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        filterChain.doFilter(request, response);
    }
}
