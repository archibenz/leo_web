package com.reinasleo.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reinasleo.api.exception.EmailDeliveryException;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final String RESEND_API_URL = "https://api.resend.com/emails";

    private static final int MAX_ATTEMPTS = 3;
    private static final long[] BACKOFF_MILLIS = {1000L, 2000L, 4000L};

    private static final String DURATION_METRIC = "reinasleo.email.resend.duration";

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meters;

    private final Counter retryCounter2;
    private final Counter retryCounter3;
    private final Counter status2xxCounter;
    private final Counter status4xxCounter;
    private final Counter status5xxCounter;

    private final Timer durationSuccess;
    private final Timer durationClientError;
    private final Timer durationServerError;
    private final Timer durationTransportError;

    @Value("${app.resend.api-key:}")
    private String resendApiKey;

    @Value("${app.resend.from:REINASLEO <noreply@reinasleo.com>}")
    private String fromAddress;

    @Autowired
    public EmailService(MeterRegistry meters) {
        this(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build(),
                new ObjectMapper(), meters);
    }

    // Test seam: позволяет подменить HttpClient (MockWebServer / Mockito) и ObjectMapper.
    EmailService(HttpClient httpClient, ObjectMapper objectMapper, MeterRegistry meters) {
        this.httpClient = httpClient;
        this.objectMapper = objectMapper;
        this.meters = meters;
        this.retryCounter2 = Counter.builder("reinasleo.email.resend.retries")
                .tag("attempt", "2").register(meters);
        this.retryCounter3 = Counter.builder("reinasleo.email.resend.retries")
                .tag("attempt", "3").register(meters);
        this.status2xxCounter = Counter.builder("reinasleo.email.resend.status")
                .tag("status_class", "2xx").register(meters);
        this.status4xxCounter = Counter.builder("reinasleo.email.resend.status")
                .tag("status_class", "4xx").register(meters);
        this.status5xxCounter = Counter.builder("reinasleo.email.resend.status")
                .tag("status_class", "5xx").register(meters);
        this.durationSuccess = durationTimer(meters, "success");
        this.durationClientError = durationTimer(meters, "client_error");
        this.durationServerError = durationTimer(meters, "server_error");
        this.durationTransportError = durationTimer(meters, "transport_error");
    }

    private static Timer durationTimer(MeterRegistry meters, String outcome) {
        return Timer.builder(DURATION_METRIC)
                .tag("outcome", outcome)
                .register(meters);
    }

    /**
     * Attempts to deliver a verification code email. Retries up to 3 times on
     * 5xx / timeout / IO errors with exponential backoff (1s, 2s, 4s). Fails
     * fast (no retry) on 4xx client errors (e.g. invalid recipient).
     *
     * @return true if Resend accepted the email (2xx), false only when
     *         misconfigured (missing API key) — currently throws instead.
     * @throws EmailDeliveryException when all retry attempts are exhausted or
     *         Resend returns a 4xx client error.
     */
    public boolean sendVerificationCode(String toEmail, String code) {
        if (resendApiKey == null || resendApiKey.isBlank()) {
            throw new IllegalStateException(
                    "RESEND_API_KEY not configured; refusing to send verification code");
        }

        Map<String, Object> payload = Map.of(
                "from", fromAddress,
                "to", new String[] {toEmail},
                "subject", "REINASLEO — Код подтверждения / Verification code",
                "html", buildHtml(code)
        );

        String jsonBody;
        try {
            jsonBody = objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new EmailDeliveryException("Failed to serialise Resend payload", e);
        }

        return sendWithRetry(toEmail, jsonBody, "verification code");
    }

    private boolean sendWithRetry(String toEmail, String jsonBody, String purpose) {
        String maskedEmail = maskEmail(toEmail);
        Exception lastTransportError = null;
        int lastStatus = -1;
        String lastBodySnippet = null;

        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            if (attempt == 2) {
                retryCounter2.increment();
            } else if (attempt == 3) {
                retryCounter3.increment();
            }

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(RESEND_API_URL))
                    .timeout(Duration.ofSeconds(15))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + resendApiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            Timer.Sample sample = Timer.start(meters);
            try {
                HttpResponse<String> response = httpClient.send(
                        request, HttpResponse.BodyHandlers.ofString());
                int status = response.statusCode();

                if (status >= 200 && status < 300) {
                    sample.stop(durationSuccess);
                    status2xxCounter.increment();
                    if (attempt > 1) {
                        log.info("Resend delivered {} to {} on attempt {}/{}",
                                purpose, maskedEmail, attempt, MAX_ATTEMPTS);
                    } else {
                        log.info("Resend delivered {} to {}", purpose, maskedEmail);
                    }
                    return true;
                }

                lastStatus = status;
                lastBodySnippet = truncate(response.body(), 300);

                // 4xx — client error, do not retry (e.g. invalid email address,
                // unauthorized key, rejected domain). Fail fast.
                if (status >= 400 && status < 500) {
                    sample.stop(durationClientError);
                    status4xxCounter.increment();
                    log.error("Resend rejected {} for {} with 4xx status={} body={}",
                            purpose, maskedEmail, status, lastBodySnippet);
                    throw new EmailDeliveryException(
                            "Resend API rejected request with status " + status);
                }

                sample.stop(durationServerError);
                status5xxCounter.increment();

                // 5xx — transient, retry with backoff
                if (attempt < MAX_ATTEMPTS) {
                    log.warn("Resend 5xx ({}) for {} on attempt {}/{}, retrying in {}ms",
                            status, maskedEmail, attempt, MAX_ATTEMPTS, BACKOFF_MILLIS[attempt - 1]);
                    if (!sleepBackoff(attempt)) {
                        break;
                    }
                }
            } catch (IOException e) {
                sample.stop(durationTransportError);
                lastTransportError = e;
                if (attempt < MAX_ATTEMPTS) {
                    log.warn("Resend IO error for {} on attempt {}/{}: {}, retrying in {}ms",
                            maskedEmail, attempt, MAX_ATTEMPTS, e.getMessage(),
                            BACKOFF_MILLIS[attempt - 1]);
                    if (!sleepBackoff(attempt)) {
                        break;
                    }
                }
            } catch (InterruptedException e) {
                sample.stop(durationTransportError);
                Thread.currentThread().interrupt();
                log.error("Resend call interrupted for {}", maskedEmail);
                throw new EmailDeliveryException("Email delivery interrupted", e);
            }
        }

        if (lastStatus >= 500) {
            log.error("Resend 5xx exhausted for {} after {} attempts, last status={} body={}",
                    maskedEmail, MAX_ATTEMPTS, lastStatus, lastBodySnippet);
            throw new EmailDeliveryException(
                    "Resend API unavailable (last status " + lastStatus + ")");
        }

        log.error("Resend transport failure exhausted for {} after {} attempts: {}",
                maskedEmail, MAX_ATTEMPTS,
                lastTransportError != null ? lastTransportError.getMessage() : "unknown");
        throw new EmailDeliveryException(
                "Failed to contact Resend API after " + MAX_ATTEMPTS + " attempts",
                lastTransportError);
    }

    private boolean sleepBackoff(int attempt) {
        try {
            Thread.sleep(BACKOFF_MILLIS[attempt - 1]);
            return true;
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    private static String maskEmail(String email) {
        if (email == null) return "***";
        int at = email.indexOf('@');
        if (at <= 0) return "***";
        char first = email.charAt(0);
        return first + "***" + email.substring(at);
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max) + "...";
    }

    private String buildHtml(String code) {
        return """
                <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 0; background: #ffffff;">
                  <!-- Header -->
                  <div style="background: #1a0f0a; padding: 32px 24px; text-align: center;">
                    <h1 style="font-size: 16px; letter-spacing: 4px; text-transform: uppercase; color: #D4A574; margin: 0; font-weight: 500;">REINASLEO</h1>
                  </div>

                  <!-- Body -->
                  <div style="padding: 40px 32px;">
                    <p style="font-size: 15px; color: #333; line-height: 1.6; margin: 0 0 8px 0;">
                      Ваш код подтверждения:
                    </p>
                    <p style="font-size: 13px; color: #888; line-height: 1.5; margin: 0 0 24px 0;">
                      Your verification code:
                    </p>

                    <div style="background: #f8f5f0; border: 1px solid #e8e0d6; border-radius: 12px; padding: 28px; text-align: center; margin-bottom: 28px;">
                      <span style="font-size: 36px; letter-spacing: 10px; font-weight: 600; color: #1a0f0a;">%s</span>
                    </div>

                    <p style="font-size: 13px; color: #999; line-height: 1.6; margin: 0;">
                      Код действителен 10 минут. Если вы не запрашивали код, просто проигнорируйте это письмо.
                    </p>
                    <p style="font-size: 12px; color: #bbb; line-height: 1.5; margin: 8px 0 0 0;">
                      This code expires in 10 minutes. If you didn't request this, please ignore this email.
                    </p>
                  </div>

                  <!-- Footer -->
                  <div style="border-top: 1px solid #eee; padding: 20px 32px; text-align: center;">
                    <p style="font-size: 11px; color: #bbb; margin: 0;">
                      &copy; REINASLEO — reinasleo.com
                    </p>
                  </div>
                </div>
                """.formatted(HtmlUtils.htmlEscape(code));
    }

}
