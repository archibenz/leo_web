package com.reinasleo.api.util;

import com.reinasleo.api.exception.BadRequestException;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Снимок с телефона обязан доехать и лечь на витрину лёгким.
 *
 * Проверяем не код ответа, а сам файл: его размер, его стороны и то, что в нём
 * не осталось метаданных съёмки.
 */
class ImageNormalizerTest {

    @Test
    void aHeavyPhotoComesBackMuchSmallerAndWithinTheLongSide() {
        byte[] photo = noisyJpeg(4032, 3024);
        assertThat(photo.length).isGreaterThan(2 * 1024 * 1024); // это правда тяжёлый кадр

        ImageNormalizer.Normalized out = ImageNormalizer.normalize(photo, "image/jpeg");

        assertThat(out.width()).isEqualTo(2000);
        assertThat(out.height()).isEqualTo(1500); // пропорции 4:3 сохранены
        assertThat(out.bytes().length).isLessThan(photo.length / 2);
        assertThat(out.extension()).isEqualTo(".jpg");
    }

    @Test
    void aPortraitPhotoIsMeasuredByItsLongSideToo() {
        ImageNormalizer.Normalized out = ImageNormalizer.normalize(noisyJpeg(3024, 4032), "image/jpeg");

        assertThat(out.height()).isEqualTo(2000);
        assertThat(out.width()).isEqualTo(1500);
    }

    @Test
    void aSmallPictureIsNotStretchedUp() {
        ImageNormalizer.Normalized out = ImageNormalizer.normalize(noisyJpeg(800, 600), "image/jpeg");

        assertThat(out.width()).isEqualTo(800);
        assertThat(out.height()).isEqualTo(600);
    }

    @Test
    void theShootingMetadataIsGone() {
        // В EXIF телефона лежат координаты съёмки — отдавать их покупателю нельзя.
        byte[] withExif = withOrientation(solidJpeg(40, 20, Color.RED, Color.BLUE), 1);
        assertThat(hasExif(withExif)).isTrue();

        ImageNormalizer.Normalized out = ImageNormalizer.normalize(withExif, "image/jpeg");

        assertThat(hasExif(out.bytes())).isFalse();
    }

    @Test
    void aPhotoShotSidewaysIsTurnedUprightBeforeTheMetadataIsDropped() {
        // Ориентация 6 = «повернуть на 90° по часовой». Слева красное, справа
        // синее; после поворота красное обязано оказаться сверху. Сбрось мы
        // метаданные не повернув — снимок лёг бы боком, и никто бы не понял почему.
        byte[] sideways = withOrientation(solidJpeg(40, 20, Color.RED, Color.BLUE), 6);

        ImageNormalizer.Normalized out = ImageNormalizer.normalize(sideways, "image/jpeg");

        assertThat(out.width()).isEqualTo(20);
        assertThat(out.height()).isEqualTo(40);
        BufferedImage img = read(out.bytes());
        assertThat(isReddish(img.getRGB(10, 5))).isTrue();
        assertThat(isBluish(img.getRGB(10, 34))).isTrue();
    }

    @Test
    void anUpsideDownPhotoIsTurnedOver() {
        byte[] flipped = withOrientation(solidJpeg(40, 20, Color.RED, Color.BLUE), 3);

        BufferedImage img = read(ImageNormalizer.normalize(flipped, "image/jpeg").bytes());

        assertThat(img.getWidth()).isEqualTo(40);
        assertThat(isBluish(img.getRGB(8, 10))).isTrue();   // синее уехало налево
        assertThat(isReddish(img.getRGB(32, 10))).isTrue();
    }

    @Test
    void transparencyStaysPngInsteadOfTurningBlack() {
        ImageNormalizer.Normalized out = ImageNormalizer.normalize(transparentPng(120, 80), "image/png");

        assertThat(out.extension()).isEqualTo(".png");
        assertThat(read(out.bytes()).getColorModel().hasAlpha()).isTrue();
    }

    @Test
    void somethingThatIsNotAPictureIsRefusedWithWordsNotAFiveHundred() {
        byte[] rubbish = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 1, 2, 3, 4, 5};

        assertThatThrownBy(() -> ImageNormalizer.normalize(rubbish, "image/jpeg"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("разобрать картинку");
    }

    @Test
    void aTinyFileDeclaringHugeDimensionsIsRefusedNotDecoded() {
        // 33 байта: подпись PNG плюс один чанк IHDR, объявляющий 60000x60000
        // (3.6 млрд пикселей) — ни одного байта пиксельных данных дальше нет,
        // да они и не нужны: IHDR читается ДО того, как что-то раскодируется,
        // и именно на этом расхождении веса и площади ловит настоящий эксплойт.
        byte[] tinyButLying = pngDeclaringSize(60_000, 60_000);

        assertThatThrownBy(() -> ImageNormalizer.normalize(tinyButLying, "image/png"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Мпикс");
    }

    // ---------------------------------------------------------------- фикстуры

    /** Валидный PNG-заголовок (подпись + IHDR) без единого байта пиксельных данных. */
    private static byte[] pngDeclaringSize(int width, int height) {
        try {
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            out.write(new byte[]{(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A});

            java.io.ByteArrayOutputStream chunk = new java.io.ByteArrayOutputStream();
            java.io.DataOutputStream data = new java.io.DataOutputStream(chunk);
            data.writeInt(width);
            data.writeInt(height);
            data.writeByte(8);  // битность канала
            data.writeByte(2);  // цветовой тип: truecolor RGB
            data.writeByte(0);  // сжатие
            data.writeByte(0);  // фильтрация
            data.writeByte(0);  // без чересстрочности
            byte[] ihdrData = chunk.toByteArray();

            byte[] typeAndData = new byte[4 + ihdrData.length];
            System.arraycopy(new byte[]{'I', 'H', 'D', 'R'}, 0, typeAndData, 0, 4);
            System.arraycopy(ihdrData, 0, typeAndData, 4, ihdrData.length);

            java.util.zip.CRC32 crc = new java.util.zip.CRC32();
            crc.update(typeAndData);

            java.io.DataOutputStream png = new java.io.DataOutputStream(out);
            png.writeInt(ihdrData.length);
            png.write(typeAndData);
            png.writeInt((int) crc.getValue());
            return out.toByteArray();
        } catch (java.io.IOException e) {
            throw new IllegalStateException(e);
        }
    }

    private static byte[] noisyJpeg(int w, int h) {
        // Шум, а не заливка: ровный цвет сжался бы в килобайты, и «тяжёлый
        // снимок» перестал бы быть тяжёлым. Пишется прямо в заднюю решётку
        // DataBufferInt через SplittableRandom, а не попиксельным
        // setRGB(x, y, random.nextInt(...)): java.util.Random синхронизирован
        // через CAS на каждый вызов, и рядом с голой записью в массив это на
        // порядок медленнее, чем рядом с setRGB, — SplittableRandom
        // синхронизации не делает вовсе. Тот же настоящий шум, другой источник
        // случайности.
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        int[] pixels = ((java.awt.image.DataBufferInt) img.getRaster().getDataBuffer()).getData();
        java.util.SplittableRandom random = new java.util.SplittableRandom(42);
        for (int i = 0; i < pixels.length; i++) {
            pixels[i] = random.nextInt() & 0xFFFFFF;
        }
        return write(img, "jpeg");
    }

    private static byte[] solidJpeg(int w, int h, Color left, Color right) {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(left);
        g.fillRect(0, 0, w / 2, h);
        g.setColor(right);
        g.fillRect(w / 2, 0, w - w / 2, h);
        g.dispose();
        return write(img, "jpeg");
    }

    private static byte[] transparentPng(int w, int h) {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();
        g.setColor(new Color(255, 0, 0, 128));
        g.fillRect(0, 0, w / 2, h);
        g.dispose();
        return write(img, "png");
    }

    /** Вклеивает APP1 с одним полем Orientation сразу за SOI — как это делает телефон. */
    private static byte[] withOrientation(byte[] jpeg, int orientation) {
        byte[] tiff = new byte[]{
                'I', 'I', 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,       // little-endian, IFD0 по смещению 8
                0x01, 0x00,                                          // одна запись
                0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00,      // тег 0x0112, SHORT, count 1
                (byte) orientation, 0x00, 0x00, 0x00,                // значение
                0x00, 0x00, 0x00, 0x00,                              // следующего IFD нет
        };
        int payload = 6 + tiff.length;
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(jpeg[0]);
        out.write(jpeg[1]); // SOI
        out.write(0xFF);
        out.write(0xE1);
        out.write((payload + 2) >> 8);
        out.write((payload + 2) & 0xFF);
        out.writeBytes(new byte[]{'E', 'x', 'i', 'f', 0, 0});
        out.writeBytes(tiff);
        out.write(jpeg, 2, jpeg.length - 2);
        return out.toByteArray();
    }

    private static boolean hasExif(byte[] jpeg) {
        for (int i = 0; i + 5 < jpeg.length; i++) {
            if (jpeg[i] == 'E' && jpeg[i + 1] == 'x' && jpeg[i + 2] == 'i' && jpeg[i + 3] == 'f'
                    && jpeg[i + 4] == 0 && jpeg[i + 5] == 0) {
                return true;
            }
        }
        return false;
    }

    private static byte[] write(BufferedImage img, String format) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(img, format, out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static BufferedImage read(byte[] bytes) {
        try {
            return ImageIO.read(new ByteArrayInputStream(bytes));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static boolean isReddish(int rgb) {
        return ((rgb >> 16) & 0xFF) > 150 && ((rgb) & 0xFF) < 110;
    }

    private static boolean isBluish(int rgb) {
        return ((rgb) & 0xFF) > 150 && ((rgb >> 16) & 0xFF) < 110;
    }
}
