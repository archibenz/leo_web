package com.reinasleo.api.util;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

public final class ImageContentValidator {

    private ImageContentValidator() {
    }

    /**
     * Настоящий тип файла по магическим байтам, а не по заявленному
     * Content-Type: {@code image/jpeg}, {@code image/png}, {@code image/webp}
     * или {@code null}, если ни один магический заголовок не совпал.
     */
    public static String detect(MultipartFile file) throws IOException {
        byte[] head = new byte[12];
        int total = 0;
        // try-with-resources: без него дескриптор течёт на каждую загрузку с
        // обеих ручек. Цикл, а не один read(): поток вправе вернуть меньше
        // байт, чем попросили (обычное дело для сетевых/буферизованных
        // источников), а WebP опознаётся только по всем двенадцати байтам —
        // короткое первое чтение увело бы настоящий WebP в «это не картинка».
        try (var in = file.getInputStream()) {
            while (total < head.length) {
                int n = in.read(head, total, head.length - total);
                if (n < 0) {
                    break;
                }
                total += n;
            }
        }
        if (total < 4) {
            return null;
        }
        if (isJpeg(head, total)) {
            return "image/jpeg";
        }
        if (isPng(head, total)) {
            return "image/png";
        }
        if (isWebp(head, total)) {
            return "image/webp";
        }
        return null;
    }

    // "image/jpg" — не официальный MIME-тип, но некоторые клиенты присылают его
    // для JPEG; настоящий формат при этом всё равно "image/jpeg" по байтам.
    public static boolean sameFamily(String detected, String declared) {
        return detected.equals(declared) || ("image/jpeg".equals(detected) && "image/jpg".equals(declared));
    }

    private static boolean isJpeg(byte[] h, int len) {
        return len >= 3
                && (h[0] & 0xFF) == 0xFF
                && (h[1] & 0xFF) == 0xD8
                && (h[2] & 0xFF) == 0xFF;
    }

    private static boolean isPng(byte[] h, int len) {
        return len >= 8
                && (h[0] & 0xFF) == 0x89
                && (h[1] & 0xFF) == 0x50
                && (h[2] & 0xFF) == 0x4E
                && (h[3] & 0xFF) == 0x47
                && (h[4] & 0xFF) == 0x0D
                && (h[5] & 0xFF) == 0x0A
                && (h[6] & 0xFF) == 0x1A
                && (h[7] & 0xFF) == 0x0A;
    }

    private static boolean isWebp(byte[] h, int len) {
        return len >= 12
                && (h[0] & 0xFF) == 0x52
                && (h[1] & 0xFF) == 0x49
                && (h[2] & 0xFF) == 0x46
                && (h[3] & 0xFF) == 0x46
                && (h[8] & 0xFF) == 0x57
                && (h[9] & 0xFF) == 0x45
                && (h[10] & 0xFF) == 0x42
                && (h[11] & 0xFF) == 0x50;
    }
}
