package com.reinasleo.api.util;

import java.nio.charset.StandardCharsets;
import java.util.Set;

/**
 * Кодек ролика без ffmpeg — разбором заголовка контейнера.
 *
 * ffmpeg на сервере нет, и ставить его — решение владельца, а не конфиг.
 * Значит серверного сжатия не делаем, а ролик, который браузер не покажет,
 * обязаны не пустить на витрину.
 *
 * MP4 разбирается по-настоящему: обход коробок до stsd и чтение четырёх
 * байт формата сэмпла. Это ровно то, что скажет ffprobe, пока moov лежит в
 * файле (а он лежит: файл у нас целиком). Не выйдет прочитать — отвечаем
 * «кодек неизвестен» и отказываем, а не пропускаем «на всякий случай».
 *
 * WebM разбирается грубее: проверяем сигнатуру EBML и ищем строку CodecID в
 * байтах. Полный разбор EBML с переменной длиной элементов ради одного поля
 * не стоит своей сложности, а строки `V_VP9` / `V_VP8` / `V_AV1` ни с чем не
 * путаются. Это упрощение, и оно здесь названо.
 */
public final class VideoContentValidator {

    /** MP4: H.264, единственный кодек, который показывают все браузеры и все телефоны. */
    private static final Set<String> MP4_WEB_READY = Set.of("avc1", "avc3");
    /** WebM: свои кодеки. H.264 внутри WebM не играет нигде — такой файл сломан. */
    private static final Set<String> WEBM_WEB_READY = Set.of("V_VP8", "V_VP9", "V_AV1");
    private static final String[] WEBM_CODEC_IDS = {"V_VP9", "V_VP8", "V_AV1", "V_MPEG4/ISO/AVC", "V_MPEGH/ISO/HEVC"};

    private static final Set<String> MP4_CONTAINERS = Set.of("moov", "trak", "mdia", "minf", "stbl");
    private static final int MAX_DEPTH = 8;

    private VideoContentValidator() {}

    /** container: mp4 | webm | null; codec: четырёхбуквенный формат MP4 или CodecID WebM, null — не прочитали. */
    public record Probe(String container, String codec) {

        public boolean webReady() {
            if (codec == null) {
                return false;
            }
            return "mp4".equals(container) ? MP4_WEB_READY.contains(codec) : WEBM_WEB_READY.contains(codec);
        }
    }

    public static Probe probe(byte[] bytes) {
        if (isMp4(bytes)) {
            return new Probe("mp4", firstSampleFormat(bytes, 0, bytes.length, 0));
        }
        if (isWebm(bytes)) {
            return new Probe("webm", webmCodecId(bytes));
        }
        return new Probe(null, null);
    }

    private static boolean isMp4(byte[] b) {
        return b.length >= 12 && "ftyp".equals(ascii(b, 4, 4));
    }

    private static boolean isWebm(byte[] b) {
        return b.length >= 4 && (b[0] & 0xFF) == 0x1A && (b[1] & 0xFF) == 0x45
                && (b[2] & 0xFF) == 0xDF && (b[3] & 0xFF) == 0xA3;
    }

    private static String firstSampleFormat(byte[] b, int from, int to, int depth) {
        if (depth > MAX_DEPTH) {
            return null;
        }
        int pos = from;
        while (pos + 8 <= to) {
            long size = u32(b, pos);
            String type = ascii(b, pos + 4, 4);
            int header = 8;
            if (size == 1) {
                if (pos + 16 > to) {
                    return null;
                }
                size = u64(b, pos + 8);
                header = 16;
            } else if (size == 0) {
                size = to - pos;
            }
            if (size < header || pos + size > to) {
                return null;
            }
            int bodyFrom = pos + header;
            int bodyTo = (int) (pos + size);
            if ("stsd".equals(type)) {
                String format = sampleEntryFormat(b, bodyFrom, bodyTo);
                if (format != null) {
                    return format;
                }
            } else if (MP4_CONTAINERS.contains(type)) {
                String nested = firstSampleFormat(b, bodyFrom, bodyTo, depth + 1);
                if (nested != null) {
                    return nested;
                }
            }
            pos = bodyTo;
        }
        return null;
    }

    // stsd: version+flags (4) + entry_count (4), дальше записи вида size (4) + format (4).
    private static String sampleEntryFormat(byte[] b, int from, int to) {
        if (from + 8 > to) {
            return null;
        }
        long entries = u32(b, from + 4);
        // pos — long нарочно: size читается из четырёх байт файла и доходит до
        // 4 294 967 295. В int это даёт отрицательный pos, а с ним ascii()
        // уходит за левую границу массива и отвечает пятисоткой вместо
        // честного «кодек не читается».
        long pos = from + 8;
        for (long i = 0; i < entries && pos + 8 <= to; i++) {
            long size = u32(b, (int) pos);
            String format = ascii(b, (int) pos + 4, 4);
            if (isVideoSampleFormat(format)) {
                return format;
            }
            if (size < 8 || pos + size > to) {
                return null;
            }
            pos += size;
        }
        return null;
    }

    // Звуковые дорожки (mp4a) и прочие не-видео записи пропускаем: витрине важен видеокодек.
    private static boolean isVideoSampleFormat(String format) {
        return format.matches("^(avc[13]|hvc1|hev1|av01|vp0[89]|mp4v|dvh[1e]|s263|jpeg|png )$");
    }

    private static String webmCodecId(byte[] b) {
        String text = new String(b, StandardCharsets.ISO_8859_1);
        String found = null;
        int best = Integer.MAX_VALUE;
        for (String id : WEBM_CODEC_IDS) {
            int at = text.indexOf(id);
            if (at >= 0 && at < best) {
                best = at;
                found = id;
            }
        }
        return found;
    }

    private static long u32(byte[] b, int at) {
        return ((long) (b[at] & 0xFF) << 24) | ((b[at + 1] & 0xFF) << 16) | ((b[at + 2] & 0xFF) << 8) | (b[at + 3] & 0xFF);
    }

    private static long u64(byte[] b, int at) {
        long value = 0;
        for (int i = 0; i < 8; i++) {
            value = (value << 8) | (b[at + i] & 0xFF);
        }
        return value;
    }

    private static String ascii(byte[] b, int at, int len) {
        if (at < 0 || len < 0 || at + len > b.length) {
            return "";
        }
        return new String(b, at, len, StandardCharsets.US_ASCII);
    }
}
