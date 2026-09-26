package com.reinasleo.api.errors;

import java.util.List;
import java.util.regex.Pattern;

/**
 * Маска для текста ошибки, уходящего в аналитику (app_error): сообщение и
 * кадры стека могут случайно нести токен, ключ, почту или телефон — из
 * исключения, в которое кто-то вклеил тело запроса или заголовок. Наружу
 * такое уйти не должно. Аналитика маскирует ещё раз у себя (mask_secrets),
 * но первая маска — здесь, до отправки.
 *
 * Правила идут от узких к широким: сначала всё, что узнаётся по форме
 * (JWT, Bearer, пара ключ=значение), потом почта и телефон, в конце —
 * длинные hex/base64-хвосты, похожие на секреты без имени.
 */
public final class SecretMask {

    static final String MASK = "***";

    private record Rule(Pattern pattern, String replacement) {}

    private static final List<Rule> RULES = List.of(
            // JWT: три base64url-части через точку, заголовок начинается с eyJ.
            new Rule(Pattern.compile("eyJ[A-Za-z0-9_-]{5,}\\.[A-Za-z0-9_-]{5,}\\.[A-Za-z0-9_-]{5,}"), MASK),
            // Authorization: Bearer <что угодно до пробела/кавычки>.
            new Rule(Pattern.compile("(?i)\\b(bearer|basic)\\s+[A-Za-z0-9._~+/=-]{6,}"), "$1 " + MASK),
            // key=value / "key": "value" для имён, которые означают секрет.
            new Rule(Pattern.compile("(?i)(\"?\\b(?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|authorization|cookie|session|rl_session|x-ingest-secret|x-bot-secret)\\b\"?\\s*[:=]\\s*\"?)([^\"\\s,;&}]+)"), "$1" + MASK),
            // Почта.
            new Rule(Pattern.compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}"), MASK),
            // Телефон: +7/8 и 10 цифр с любыми разделителями, либо 11+ цифр подряд.
            new Rule(Pattern.compile("(?<![\\w.])(?:\\+?\\d[\\s()-]*){10,15}(?![\\w.])"), MASK),
            // Безымянные секреты: длинный hex (32+) или base64 (40+).
            new Rule(Pattern.compile("\\b[a-fA-F0-9]{32,}\\b"), MASK),
            new Rule(Pattern.compile("[A-Za-z0-9+/_-]{40,}={0,2}"), MASK)
    );

    private SecretMask() {}

    public static String mask(String text) {
        if (text == null || text.isEmpty()) return text;
        String out = text;
        for (Rule rule : RULES) {
            out = rule.pattern().matcher(out).replaceAll(rule.replacement());
        }
        return out;
    }

    /** Маска и обрезка до предела приёма (message ≤500, кадр ≤200, класс ≤200). */
    public static String maskAndClip(String text, int max) {
        String masked = mask(text);
        if (masked == null) return null;
        return masked.length() <= max ? masked : masked.substring(0, max);
    }
}
