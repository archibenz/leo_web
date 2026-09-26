package com.reinasleo.api.errors;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.regex.Pattern;

/**
 * Отпечаток ошибки для склейки повторов: sha256(app + kind + класс +
 * нормализованное сообщение + верхний «наш» кадр). Правило общее с
 * аналитикой — она считает свои ошибки так же, а группу ключует
 * app + ":" + fingerprint.
 *
 * Нормализация убирает то, что меняется от случая к случаю при одной и той же
 * поломке: числа, UUID, адреса, id в путях. Без неё «заказ 123 не найден» и
 * «заказ 124 не найден» были бы двумя разными ошибками, и счётчик повторов
 * ничего бы не значил.
 */
public final class ErrorFingerprint {

    private static final Pattern UUID = Pattern.compile(
            "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}");
    private static final Pattern URL = Pattern.compile("https?://\\S+");
    private static final Pattern NUMBER = Pattern.compile("\\d+");
    private static final Pattern SPACES = Pattern.compile("\\s+");

    private ErrorFingerprint() {}

    static String normalize(String message) {
        if (message == null) return "";
        String out = UUID.matcher(message).replaceAll("<id>");
        out = URL.matcher(out).replaceAll("<url>");
        out = NUMBER.matcher(out).replaceAll("<n>");
        out = SPACES.matcher(out).replaceAll(" ").trim();
        return out.length() <= 300 ? out : out.substring(0, 300);
    }

    public static String of(String app, String kind, String errorClass, String message, String topFrame) {
        // Кадр тоже нормализуется: номер строки сдвигается от любой правки выше
        // по файлу, и без этого каждая выкатка рождала бы «новую» ошибку и
        // новую тревогу по старой поломке.
        String key = String.join("\u0001",
                nz(app), nz(kind), nz(errorClass), normalize(message), normalize(topFrame));
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(key.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is always available", e);
        }
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }
}
