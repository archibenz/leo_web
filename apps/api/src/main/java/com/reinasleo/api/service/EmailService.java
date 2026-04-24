package com.reinasleo.api.service;

import com.reinasleo.api.exception.EmailDeliveryException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final String RESEND_API_URL = "https://api.resend.com/emails";

    private static final int MAX_ATTEMPTS = 3;
    private static final long[] BACKOFF_MILLIS = {1000L, 2000L, 4000L};

    private final HttpClient httpClient;

    @Value("${app.resend.api-key:}")
    private String resendApiKey;

    @Value("${app.resend.from:REINASLEO <noreply@reinasleo.com>}")
    private String fromAddress;

    public EmailService() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
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

        String jsonBody = """
                {
                  "from": "%s",
                  "to": ["%s"],
                  "subject": "REINASLEO — Код подтверждения / Verification code",
                  "html": %s
                }
                """.formatted(
                escapeJson(fromAddress),
                escapeJson(toEmail),
                toJsonString(buildHtml(code))
        );

        return sendWithRetry(toEmail, jsonBody, "verification code");
    }

    private boolean sendWithRetry(String toEmail, String jsonBody, String purpose) {
        String maskedEmail = maskEmail(toEmail);
        Exception lastTransportError = null;
        int lastStatus = -1;
        String lastBodySnippet = null;

        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(RESEND_API_URL))
                    .timeout(Duration.ofSeconds(15))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + resendApiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            try {
                HttpResponse<String> response = httpClient.send(
                        request, HttpResponse.BodyHandlers.ofString());
                int status = response.statusCode();

                if (status >= 200 && status < 300) {
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
                    log.error("Resend rejected {} for {} with 4xx status={} body={}",
                            purpose, maskedEmail, status, lastBodySnippet);
                    throw new EmailDeliveryException(
                            "Resend API rejected request with status " + status);
                }

                // 5xx — transient, retry with backoff
                if (attempt < MAX_ATTEMPTS) {
                    log.warn("Resend 5xx ({}) for {} on attempt {}/{}, retrying in {}ms",
                            status, maskedEmail, attempt, MAX_ATTEMPTS, BACKOFF_MILLIS[attempt - 1]);
                    if (!sleepBackoff(attempt)) {
                        break;
                    }
                }
            } catch (IOException e) {
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
                """.formatted(code);
    }

    private static String escapeJson(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private static String toJsonString(String value) {
        return "\"" + value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t")
                + "\"";
    }
}
