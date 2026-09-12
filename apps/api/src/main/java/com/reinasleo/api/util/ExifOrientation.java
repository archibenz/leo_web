package com.reinasleo.api.util;

/**
 * Ориентация снимка из EXIF — одно поле, разобранное руками.
 *
 * ПОЧЕМУ РУКАМИ. Стандартный ImageIO ориентацию JPEG не читает вовсе: он
 * отдаёт пиксели так, как они лежат в файле, а телефон пишет их боком и
 * приписывает «поверни». Сбросив метаданные без поворота, мы разложили бы
 * половину снимков владельца набок — и никто бы не понял почему. Библиотеку
 * ради одного поля не тянем: формат здесь короткий и закрытый.
 *
 * Разбирается ровно столько, сколько нужно: APP1 → «Exif\0\0» → заголовок TIFF
 * → IFD0 → тег 0x0112. Всё, что не сошлось (нет сегмента, чужой порядок байт,
 * обрезанный файл), читается как «поворота нет» — это безопасная сторона
 * ошибки: снимок останется как есть, а не перевернётся наугад.
 */
public final class ExifOrientation {

    /** Снимок лежит правильно; ничего поворачивать не надо. */
    public static final int NORMAL = 1;

    private static final int SOI = 0xFFD8;
    private static final int APP1 = 0xFFE1;
    private static final int SOS = 0xFFDA;
    private static final int ORIENTATION_TAG = 0x0112;

    private ExifOrientation() {}

    /** 1..8 по спецификации EXIF; 1, если ориентации нет или файл не разобрался. */
    public static int of(byte[] jpeg) {
        if (jpeg == null || jpeg.length < 4 || u16(jpeg, 0) != SOI) {
            return NORMAL;
        }
        int pos = 2;
        // Сегменты идут подряд: FFxx + длина. До SOS, после него начинаются
        // сжатые данные и маркеры там уже не маркеры.
        while (pos + 4 <= jpeg.length) {
            if ((jpeg[pos] & 0xFF) != 0xFF) {
                return NORMAL;
            }
            int marker = u16(jpeg, pos);
            if (marker == SOS) {
                return NORMAL;
            }
            int length = u16(jpeg, pos + 2);
            if (length < 2 || pos + 2 + length > jpeg.length) {
                return NORMAL;
            }
            if (marker == APP1 && isExif(jpeg, pos + 4)) {
                return fromTiff(jpeg, pos + 10, pos + 2 + length);
            }
            pos += 2 + length;
        }
        return NORMAL;
    }

    private static boolean isExif(byte[] b, int at) {
        return at + 6 <= b.length
                && b[at] == 'E' && b[at + 1] == 'x' && b[at + 2] == 'i' && b[at + 3] == 'f'
                && b[at + 4] == 0 && b[at + 5] == 0;
    }

    /** `tiff` — начало заголовка TIFF; все смещения внутри считаются от него. */
    private static int fromTiff(byte[] b, int tiff, int end) {
        if (tiff + 8 > end) {
            return NORMAL;
        }
        boolean little;
        if (b[tiff] == 'I' && b[tiff + 1] == 'I') {
            little = true;
        } else if (b[tiff] == 'M' && b[tiff + 1] == 'M') {
            little = false;
        } else {
            return NORMAL;
        }
        if (u16(b, tiff + 2, little) != 0x002A) {
            return NORMAL;
        }
        long ifd = u32(b, tiff + 4, little);
        long entriesAt = tiff + ifd;
        if (entriesAt + 2 > end || entriesAt < tiff) {
            return NORMAL;
        }
        int count = u16(b, (int) entriesAt, little);
        for (int i = 0; i < count; i++) {
            long entry = entriesAt + 2 + (long) i * 12;
            if (entry + 12 > end) {
                return NORMAL;
            }
            if (u16(b, (int) entry, little) == ORIENTATION_TAG) {
                int value = u16(b, (int) entry + 8, little);
                return value >= 1 && value <= 8 ? value : NORMAL;
            }
        }
        return NORMAL;
    }

    private static int u16(byte[] b, int at) {
        return ((b[at] & 0xFF) << 8) | (b[at + 1] & 0xFF);
    }

    private static int u16(byte[] b, int at, boolean little) {
        return little
                ? ((b[at + 1] & 0xFF) << 8) | (b[at] & 0xFF)
                : ((b[at] & 0xFF) << 8) | (b[at + 1] & 0xFF);
    }

    private static long u32(byte[] b, int at, boolean little) {
        return little
                ? (long) (b[at] & 0xFF) | ((long) (b[at + 1] & 0xFF) << 8)
                    | ((long) (b[at + 2] & 0xFF) << 16) | ((long) (b[at + 3] & 0xFF) << 24)
                : ((long) (b[at] & 0xFF) << 24) | ((long) (b[at + 1] & 0xFF) << 16)
                    | ((long) (b[at + 2] & 0xFF) << 8) | (long) (b[at + 3] & 0xFF);
    }
}
