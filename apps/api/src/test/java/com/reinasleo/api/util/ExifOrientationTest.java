package com.reinasleo.api.util;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Random;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * ExifOrientation разбирает чужой бинарь руками — до сих пор без единого
 * своего теста, хотя класс разбирали вручную дважды (при ревью и при
 * повторном ревью) и оба раза чисто. Здесь это закрепляется: фуззинг на
 * детерминированном зерне плюс прицельные пробы на каждую границу разбора.
 *
 * Утверждается одно и то же на всех входах: исключений нет никогда, результат
 * всегда в 1..8, обход не зацикливается (тест не висит).
 */
class ExifOrientationTest {

    @Test
    @Timeout(30)
    void twoHundredThousandRandomBlobsNeverThrowAndAlwaysReturnAValidOrientation() {
        // Не два миллиона — набор должен оставаться быстрым. Половина блобов
        // стартует с настоящего SOI: иначе почти все 200 000 попыток отсеются
        // на первой проверке, так и не тронув обход сегментов.
        Random random = new Random(20260912L);
        for (int i = 0; i < 200_000; i++) {
            byte[] blob = randomBlob(random);
            int result = ExifOrientation.of(blob);
            assertThat(result).isBetween(1, 8);
        }
    }

    @Test
    void anIfdOffsetOfAllOnesIsSafelyRejected() {
        byte[] jpeg = jpegWithApp1(exifPayload(tiffHeader(true, 0xFFFFFFFFL)));

        assertThat(ExifOrientation.of(jpeg)).isEqualTo(ExifOrientation.NORMAL);
    }

    @Test
    void anIfdOffsetAtMaxSignedIntIsSafelyRejected() {
        byte[] jpeg = jpegWithApp1(exifPayload(tiffHeader(true, 0x7FFFFFFFL)));

        assertThat(ExifOrientation.of(jpeg)).isEqualTo(ExifOrientation.NORMAL);
    }

    @Test
    void truncatingARealPhotoAtEveryPrefixLengthNeverThrowsAndStaysInRange() {
        byte[] full = validExifWithOrientation(true, 6);

        for (int len = 0; len <= full.length; len++) {
            byte[] prefix = Arrays.copyOf(full, len);
            assertThat(ExifOrientation.of(prefix)).isBetween(1, 8);
        }
    }

    @Test
    void bigEndianByteOrderIsReadCorrectlyNotTreatedAsUnknown() {
        // Комментарий класса раньше говорил «чужой порядок байт → поворота
        // нет» — а MM читается прицельно верно, это не «чужой», это второй
        // ИЗ ДВУХ поддерживаемых порядков.
        byte[] jpeg = validExifWithOrientation(false, 6);

        assertThat(ExifOrientation.of(jpeg)).isEqualTo(6);
    }

    @Test
    void littleEndianByteOrderIsReadCorrectlyAndNumerically() {
        // 'II' — не «раз не упало», а численно то же значение, что записано.
        byte[] jpeg = validExifWithOrientation(true, 6);

        assertThat(ExifOrientation.of(jpeg)).isEqualTo(6);
    }

    @Test
    void orientationThreeInARealJpegReturnsExactlyThree() {
        // Мутация «return NORMAL» тоже удовлетворила бы «в 1..8» — здесь
        // утверждается конкретное значение, отличное от NORMAL (1).
        byte[] jpeg = validExifWithOrientation(true, 3);

        assertThat(ExifOrientation.of(jpeg)).isEqualTo(3);
    }

    @Test
    void orientationEightAtTheTopOfTheValidRangeReturnsExactlyEight() {
        // Пара к anOrientationValueOfNineFallsBackToNormal: граница 1..8
        // включительная с обеих сторон, и обе стороны должны быть проверены
        // не диапазоном (иначе снова только «не упало»).
        assertThat(ExifOrientation.of(validExifWithOrientation(true, 8))).isEqualTo(8);
    }

    @Test
    void anOrientationValueOfZeroFallsBackToNormal() {
        assertThat(ExifOrientation.of(validExifWithOrientation(true, 0))).isEqualTo(ExifOrientation.NORMAL);
    }

    @Test
    void anOrientationValueOfNineFallsBackToNormal() {
        assertThat(ExifOrientation.of(validExifWithOrientation(true, 9))).isEqualTo(ExifOrientation.NORMAL);
    }

    @Test
    void anOrientationValueOf65535FallsBackToNormal() {
        assertThat(ExifOrientation.of(validExifWithOrientation(true, 65535))).isEqualTo(ExifOrientation.NORMAL);
    }

    @Test
    void exifFoundAfterAnotherSegmentIsStillRead() {
        // Покрывает pos += 2 + length: без него цикл не добрался бы до
        // второго сегмента вовсе.
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(0xFF);
        out.write(0xD8); // SOI
        out.writeBytes(app0Segment());
        out.writeBytes(app1Segment(exifPayload(tiffWithOrientation(true, 6))));

        assertThat(ExifOrientation.of(out.toByteArray())).isEqualTo(6);
    }

    @Test
    void aSosMarkerStopsTheScanEvenWhenARealExifSegmentFollows() {
        // Ранний выход на SOS ничем не покрыт, если после SOS нет ничего,
        // что могло бы дать другой ответ, — мутация «удалить return» тогда
        // осталась бы незамеченной. Здесь после (поддельного, минимальной
        // длины) SOS сразу идёт настоящий Exif с ориентацией: без раннего
        // выхода результат был бы 6, а не NORMAL.
        byte[] realExifAfterSos = app1Segment(exifPayload(tiffWithOrientation(true, 6)));
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(0xFF);
        out.write(0xD8); // SOI
        out.write(0xFF);
        out.write(0xDA); // SOS
        out.write(0x00);
        out.write(0x02); // длина сегмента SOS — минимально валидная, без данных
        out.writeBytes(realExifAfterSos);

        assertThat(ExifOrientation.of(out.toByteArray())).isEqualTo(ExifOrientation.NORMAL);
    }

    @Test
    void aLyingEntryCountOf65535DoesNotReadPastTheSegment() {
        ByteArrayOutputStream ifd = new ByteArrayOutputStream();
        writeU16(ifd, 65535, true); // заявлено 65535 записей, ни одной настоящей дальше нет

        ByteArrayOutputStream tiff = new ByteArrayOutputStream();
        tiff.writeBytes(tiffHeader(true, 8));
        tiff.writeBytes(ifd.toByteArray());
        byte[] jpeg = jpegWithApp1(exifPayload(tiff.toByteArray()));

        assertThat(ExifOrientation.of(jpeg)).isEqualTo(ExifOrientation.NORMAL);
    }

    @Test
    void app1SegmentLengthZeroIsRejectedNotRead() {
        assertThat(ExifOrientation.of(jpegWithRawApp1Length(0))).isEqualTo(ExifOrientation.NORMAL);
    }

    @Test
    void app1SegmentLengthOneIsRejectedNotRead() {
        assertThat(ExifOrientation.of(jpegWithRawApp1Length(1))).isEqualTo(ExifOrientation.NORMAL);
    }

    @Test
    void app1WithXmpInsteadOfExifIsSkippedNotMisread() {
        byte[] xmpPayload = "http://ns.adobe.com/xap/1.0/\0<x:xmpmeta/>"
                .getBytes(StandardCharsets.US_ASCII);

        assertThat(ExifOrientation.of(jpegWithApp1(xmpPayload))).isEqualTo(ExifOrientation.NORMAL);
    }

    @Test
    void aLongRunOfFillBytesIsSafelyRejected() {
        byte[] jpeg = new byte[1000];
        jpeg[0] = (byte) 0xFF;
        jpeg[1] = (byte) 0xD8;
        Arrays.fill(jpeg, 2, jpeg.length, (byte) 0xFF);

        assertThat(ExifOrientation.of(jpeg)).isEqualTo(ExifOrientation.NORMAL);
    }

    // ---------------------------------------------------------------- фикстуры

    private static byte[] randomBlob(Random random) {
        byte[] blob = new byte[random.nextInt(300)];
        random.nextBytes(blob);
        if (blob.length >= 2 && random.nextBoolean()) {
            blob[0] = (byte) 0xFF;
            blob[1] = (byte) 0xD8;
        }
        return blob;
    }

    /** Настоящий валидный Exif/TIFF с одной записью Orientation, готовый JPEG. */
    private static byte[] validExifWithOrientation(boolean little, int orientationValue) {
        return jpegWithApp1(exifPayload(tiffWithOrientation(little, orientationValue)));
    }

    /** То же самое, но только заголовок TIFF+IFD0 — без обёртки APP1/JPEG. */
    private static byte[] tiffWithOrientation(boolean little, int orientationValue) {
        ByteArrayOutputStream ifd = new ByteArrayOutputStream();
        writeU16(ifd, 1, little);           // одна запись
        writeU16(ifd, 0x0112, little);      // тег Orientation
        writeU16(ifd, 3, little);           // тип SHORT
        writeU32(ifd, 1, little);           // count = 1
        writeU16(ifd, orientationValue, little);
        writeU16(ifd, 0, little);           // паддинг до 4 байт значения
        writeU32(ifd, 0, little);           // следующего IFD нет

        ByteArrayOutputStream tiff = new ByteArrayOutputStream();
        tiff.writeBytes(tiffHeader(little, 8)); // IFD0 сразу после восьмибайтного заголовка
        tiff.writeBytes(ifd.toByteArray());
        return tiff.toByteArray();
    }

    private static byte[] exifPayload(byte[] tiff) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.writeBytes(new byte[]{'E', 'x', 'i', 'f', 0, 0});
        out.writeBytes(tiff);
        return out.toByteArray();
    }

    private static byte[] tiffHeader(boolean little, long ifdOffset) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        if (little) {
            out.write('I');
            out.write('I');
        } else {
            out.write('M');
            out.write('M');
        }
        writeU16(out, 0x002A, little);
        writeU32(out, ifdOffset, little);
        return out.toByteArray();
    }

    private static byte[] jpegWithApp1(byte[] payload) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(0xFF);
        out.write(0xD8); // SOI
        out.writeBytes(app1Segment(payload));
        return out.toByteArray();
    }

    /** Один сегмент APP1 целиком (маркер + длина + тело), без SOI и без обёртки JPEG. */
    private static byte[] app1Segment(byte[] payload) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(0xFF);
        out.write(0xE1); // APP1
        int length = payload.length + 2; // длина сегмента включает себя, не включает маркер
        out.write((length >> 8) & 0xFF);
        out.write(length & 0xFF);
        out.writeBytes(payload);
        return out.toByteArray();
    }

    /** Безобидный сегмент APP0/JFIF — просто «что-то ещё» перед интересующим нас сегментом. */
    private static byte[] app0Segment() {
        byte[] payload = "JFIF\0".getBytes(StandardCharsets.US_ASCII);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(0xFF);
        out.write(0xE0); // APP0
        int length = payload.length + 2;
        out.write((length >> 8) & 0xFF);
        out.write(length & 0xFF);
        out.writeBytes(payload);
        return out.toByteArray();
    }

    private static byte[] jpegWithRawApp1Length(int declaredLength) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(0xFF);
        out.write(0xD8);
        out.write(0xFF);
        out.write(0xE1);
        out.write((declaredLength >> 8) & 0xFF);
        out.write(declaredLength & 0xFF);
        return out.toByteArray();
    }

    private static void writeU16(ByteArrayOutputStream out, int value, boolean little) {
        if (little) {
            out.write(value & 0xFF);
            out.write((value >> 8) & 0xFF);
        } else {
            out.write((value >> 8) & 0xFF);
            out.write(value & 0xFF);
        }
    }

    private static void writeU32(ByteArrayOutputStream out, long value, boolean little) {
        if (little) {
            out.write((int) (value & 0xFF));
            out.write((int) ((value >> 8) & 0xFF));
            out.write((int) ((value >> 16) & 0xFF));
            out.write((int) ((value >> 24) & 0xFF));
        } else {
            out.write((int) ((value >> 24) & 0xFF));
            out.write((int) ((value >> 16) & 0xFF));
            out.write((int) ((value >> 8) & 0xFF));
            out.write((int) (value & 0xFF));
        }
    }
}
