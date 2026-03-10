package com.reinasleo.api.service;

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
            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setSubject("REINASLEO — Your verification code");
            helper.setText(buildHtml(code), true);
            mailSender.send(message);
            log.info("Verification code sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", toEmail, e.getMessage());
            // Log the code so registration can proceed even if mail fails in dev
            log.warn("Fallback — verification code for {}: {}", toEmail, code);
        }
    }

    private String buildHtml(String code) {
        return """
                <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
                  <h2 style="font-size: 14px; letter-spacing: 3px; text-transform: uppercase; color: #1a1a1a; margin-bottom: 32px;">REINASLEO</h2>
                  <p style="font-size: 15px; color: #333; line-height: 1.6; margin-bottom: 24px;">
                    Your verification code:
                  </p>
                  <div style="background: #f5f3ef; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                    <span style="font-size: 32px; letter-spacing: 8px; font-weight: 600; color: #1a1a1a;">%s</span>
                  </div>
                  <p style="font-size: 13px; color: #888; line-height: 1.5;">
                    This code expires in 10 minutes. If you didn't request this, please ignore this email.
                  </p>
                </div>
                """.formatted(code);
    }
}
