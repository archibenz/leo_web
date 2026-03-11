package com.reinasleo.api.service;

import jakarta.mail.internet.InternetAddress;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromAddress;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendVerificationCode(String toEmail, String code) {
        if (fromAddress == null || fromAddress.isBlank()) {
            log.warn("Mail not configured — verification code for {}: {}", toEmail, code);
            return;
        }

        try {
            var message = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(new InternetAddress(fromAddress, "REINASLEO"));
            helper.setTo(toEmail);
            helper.setSubject("REINASLEO — Код подтверждения / Verification code");
            helper.setText(buildHtml(code), true);
            mailSender.send(message);
            log.info("Verification code sent to {}", toEmail);
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
}
