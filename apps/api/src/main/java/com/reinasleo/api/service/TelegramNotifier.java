package com.reinasleo.api.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * R8 stub: отправка системных сообщений в Telegram-бот.
 *
 * <p>На текущем этапе реального вызова TG Bot API нет — все сообщения
 * только логируются. Когда подключим клиент к {@code @reinasleo_studio_aibot}
 * (отдельный сервис {@code hermes-gateway}), этот класс получит реальный
 * HTTP-вызов на {@code https://api.telegram.org/bot<token>/sendMessage}.</p>
 *
 * <p>Контракт остаётся стабильным: остальная часть бэкенда вызывает
 * {@link #sendDeleteChallenge(Long, String)} и не знает, есть ли уже
 * интеграция или нет.</p>
 */
@Service
public class TelegramNotifier {

    private static final Logger log = LoggerFactory.getLogger(TelegramNotifier.class);

    public void sendDeleteChallenge(Long telegramId, String code) {
        if (telegramId == null) {
            log.warn("delete_challenge.send_skipped reason=null_telegram_id");
            return;
        }
        // TODO(R8-follow-up): replace with real Telegram Bot API sendMessage call.
        // Until then, log the event with a masked code so we can confirm flow
        // end-to-end in staging without leaking the code into prod logs.
        log.info("delete_challenge.sent telegram_id={} code_len={} code_masked={}",
                telegramId, code.length(), maskCode(code));
    }

    private static String maskCode(String code) {
        if (code == null || code.length() < 4) return "****";
        return code.charAt(0) + "****" + code.charAt(code.length() - 1);
    }
}
