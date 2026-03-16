package com.reinasleo.api.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final String RESEND_API_URL = "https://api.resend.com/emails";

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

    public void sendVerificationCode(String toEmail, String code) {
        if (resendApiKey == null || resendApiKey.isBlank()) {
            log.warn("Resend API key not configured — verification code for {}: {}", toEmail, code);
            return;
        }

        try {
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

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(RESEND_API_URL))
                    .timeout(Duration.ofSeconds(15))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + resendApiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("Verification code sent to {} via Resend", toEmail);
            } else {
                log.error("Resend API error ({}): {}", response.statusCode(), response.body());
                log.warn("Fallback — verification code for {}: {}", toEmail, code);
            }
        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", toEmail, e.getMessage());
            log.warn("Fallback — verification code for {}: {}", toEmail, code);
        }
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
