package com.reinasleo.api.util;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

public final class ImageContentValidator {

    private ImageContentValidator() {
    }

    public static boolean isSupportedImage(MultipartFile file) throws IOException {
        byte[] head = new byte[12];
        int read = file.getInputStream().read(head);
        if (read < 4) {
            return false;
        }
        return isJpeg(head, read) || isPng(head, read) || isWebp(head, read);
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
