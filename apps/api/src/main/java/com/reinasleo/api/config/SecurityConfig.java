package com.reinasleo.api.config;

import com.reinasleo.api.security.JwtAuthFilter;
import com.reinasleo.api.security.MetricsAuthFilter;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${app.cors.allowed-origins}")
    private String[] allowedOrigins;

    private final JwtAuthFilter jwtAuthFilter;
    private final MetricsAuthFilter metricsAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter, MetricsAuthFilter metricsAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.metricsAuthFilter = metricsAuthFilter;
    }

    @PostConstruct
    void validateCorsOrigins() {
        if (allowedOrigins == null || allowedOrigins.length == 0
                || Arrays.stream(allowedOrigins).allMatch(s -> s == null || s.isBlank())) {
            throw new IllegalStateException(
                    "CORS_ORIGIN env var is required — refusing to start. "
                            + "Set it to a comma-separated list of allowed origins (no default).");
        }
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())
                .logout(logout -> logout.disable())
                .headers(headers -> {
                    headers.frameOptions(frame -> frame.deny());
                    headers.contentTypeOptions(content -> {});
                    headers.cacheControl(cache -> cache.disable());
                    headers.referrerPolicy(referrer -> referrer.policy(
                        org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN));
                    headers.permissionsPolicy(permissions -> permissions.policy(
                        "camera=(), microphone=(), geolocation=()"));
                    // Defence-in-depth: nginx / Cloudflare usually inject HSTS, but emitting
                    // it here too keeps the guarantee if the proxy is bypassed. 63072000s = 2y.
                    headers.httpStrictTransportSecurity(hsts -> hsts
                        .includeSubDomains(true)
                        .maxAgeInSeconds(63072000));
                })
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Static and infra
                        .requestMatchers("/error").permitAll()
                        .requestMatchers("/uploads/**").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        .requestMatchers("/actuator/prometheus").hasAnyAuthority("ROLE_ADMIN", "ROLE_METRICS")
                        .requestMatchers("/actuator/**").hasAuthority("ROLE_ADMIN")
                        // Public read APIs
                        .requestMatchers("/api/health").permitAll()
                        .requestMatchers("/api/lookbook", "/api/lookbook/**").permitAll()
                        .requestMatchers("/api/catalog/**").permitAll()
                        .requestMatchers("/api/care-guides", "/api/care-guides/**").permitAll()
                        // Public POST APIs (rate-limited or secret-protected at controller layer)
                        .requestMatchers("/api/contact").permitAll()
                        .requestMatchers("/api/auth/**").permitAll()
                        // /api/bot/admin/** is technically covered by /api/bot/** below;
                        // listed explicitly so the next reader sees that bot admin endpoints
                        // exist and rely on the controller-side X-Bot-Secret check.
                        .requestMatchers("/api/bot/admin/**").permitAll()
                        .requestMatchers("/api/bot/**").permitAll()
                        // Authenticated APIs (JWT)
                        .requestMatchers("/api/me/**").authenticated()
                        .requestMatchers("/api/admin/**").hasAuthority("ROLE_ADMIN")
                        // Catch-all
                        .anyRequest().denyAll()
                )
                .addFilterBefore(metricsAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(allowedOrigins));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of(
            "Authorization", "Content-Type", "X-Bot-Secret", "Accept", "Origin"
        ));
        // JWT lives in Authorization header, cookies are not used. Keeping this false
        // means any future cookie-based auth must first re-enable CSRF protection.
        configuration.setAllowCredentials(false);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        // Also register CORS for /uploads/** because the static ResourceHttpRequestHandler
        // serves images from there. In production everything is same-origin via nginx,
        // but in local dev the web app on :3000 fetches from the API on :8080.
        source.registerCorsConfiguration("/uploads/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
