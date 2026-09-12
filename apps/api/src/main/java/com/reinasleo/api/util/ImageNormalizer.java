package com.reinasleo.api.util;

import com.reinasleo.api.exception.BadRequestException;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReadParam;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;
import java.awt.RenderingHints;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Iterator;

/**
 * Снимок с телефона — на витрину.
 *
 * Принимать тяжёлое и класть тяжёлое — значит перенести боль с владельца на
 * покупателя: двенадцатимегабайтный кадр поехал бы в галерею товара. Поэтому
 * приём и уменьшение идут строго парой, и порядок шагов внутри тоже обязателен:
 *
 *   1. поворот по EXIF — ДО всего остального;
 *   2. уменьшение до длинной стороны 2000 px с сохранением пропорций;
 *   3. перекодирование из голого растра — метаданные исчезают сами собой.
 *
 * Шаг 1 перед шагом 3 не переставить: в EXIF лежит и «поверни», и координаты
 * съёмки. Сбросив метаданные первыми, мы потеряли бы поворот, и половина
 * снимков легла бы набок.
 */
public final class ImageNormalizer {

    /** Длинная сторона витринного кадра. Шире — покупатель платит трафиком, не видя разницы. */
    public static final int MAX_SIDE = 2000;
    // Потолок площади, а не веса: маленький сжатый файл может объявить в
    // заголовке какие угодно размеры, а ImageIO.read разворачивает растр
    // целиком (ширина × высота × 4 байта) ещё до того, как мы увидим итоговый
    // вес. 50 Мпикс — с большим запасом над любым настоящим снимком с
    // телефона (12-48 Мпикс сенсоры).
    public static final long MAX_PIXELS = 50_000_000L;
    private static final float JPEG_QUALITY = 0.82f;

    public record Normalized(byte[] bytes, String extension, int width, int height) {}

    private ImageNormalizer() {}

    public static Normalized normalize(byte[] source, String contentType) {
        BufferedImage decoded = decode(source);
        BufferedImage upright = "image/png".equals(contentType)
                ? decoded                       // PNG ориентации не носит
                : turn(decoded, ExifOrientation.of(source));
        BufferedImage fitted = fit(upright);

        // Прозрачность уводим в PNG. JPEG альфы не знает, и вырезанный по
        // контуру кадр получил бы чёрный фон вместо пустоты.
        boolean transparent = fitted.getColorModel().hasAlpha() && hasTransparentPixel(fitted);
        return transparent
                ? new Normalized(writePng(fitted), ".png", fitted.getWidth(), fitted.getHeight())
                : new Normalized(writeJpeg(flatten(fitted)), ".jpg", fitted.getWidth(), fitted.getHeight());
    }

    private static BufferedImage decode(byte[] source) {
        try (ImageInputStream iis = ImageIO.createImageInputStream(new ByteArrayInputStream(source))) {
            if (iis == null) {
                throw new BadRequestException(UploadMessages.UNREADABLE_IMAGE);
            }
            Iterator<ImageReader> readers = ImageIO.getImageReaders(iis);
            if (!readers.hasNext()) {
                throw new BadRequestException(UploadMessages.UNREADABLE_IMAGE);
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(iis, true, true);
                // Размеры — из заголовка, БЕЗ раскодирования пикселей, чтобы решить
                // и потолок, и шаг подвыборки ДО того, как что-то попадёт в память.
                // int*int здесь переполнился бы на реальных значениях (65535×65535
                // больше Integer.MAX_VALUE) — оба множителя приведены к long ДО
                // умножения.
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                long pixels = (long) width * (long) height;
                if (pixels > MAX_PIXELS) {
                    throw new BadRequestException(UploadMessages.IMAGE_TOO_MANY_PIXELS);
                }

                // Потолок в 50 Мпикс сам по себе не спасает: даже честный кадр под
                // потолком разворачивается в ширина×высота×4 байта, а decode и turn
                // держат два таких растра разом — на 50 Мпикс это ~400 МБ на один
                // запрос, и второй одновременный запрос кладёт процесс целиком
                // (Dockerfile гасит его при нехватке памяти). Подвыборка при самом
                // чтении не даёт полноразмерному растру появиться вовсе: reader.read
                // ниже разворачивает уже уменьшенное изображение. Шаг подобран так,
                // чтобы результат остался не меньше удвоенной целевой стороны
                // (MAX_SIDE) — тогда bicubic-уменьшение в fit() ниже всё ещё берёт
                // материал с запасом резкости, а не растягивает то, что уже мелко.
                ImageReadParam param = reader.getDefaultReadParam();
                int step = subsamplingStep(Math.max(width, height));
                if (step > 1) {
                    param.setSourceSubsampling(step, step, 0, 0);
                }

                BufferedImage image = reader.read(0, param);
                if (image == null || image.getWidth() <= 0 || image.getHeight() <= 0) {
                    throw new BadRequestException(UploadMessages.UNREADABLE_IMAGE);
                }
                return image;
            } finally {
                reader.dispose();
            }
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException(UploadMessages.UNREADABLE_IMAGE);
        }
    }

    /**
     * Наибольший целый шаг, при котором длинная сторона после подвыборки
     * остаётся не меньше удвоенного {@link #MAX_SIDE}. 1 — если исходник и
     * так меньше этого порога: подвыборка ему не нужна, читаем как есть.
     */
    private static int subsamplingStep(int longSide) {
        return Math.max(1, longSide / (2 * MAX_SIDE));
    }

    /** Восемь положений EXIF: четыре поворота и четыре они же с отражением. */
    private static BufferedImage turn(BufferedImage src, int orientation) {
        if (orientation == ExifOrientation.NORMAL) {
            return src;
        }
        int w = src.getWidth();
        int h = src.getHeight();
        boolean sideways = orientation >= 5;
        AffineTransform t = new AffineTransform();
        switch (orientation) {
            case 2 -> {
                t.scale(-1, 1);
                t.translate(-w, 0);
            }
            case 3 -> {
                t.translate(w, h);
                t.rotate(Math.PI);
            }
            case 4 -> {
                t.scale(1, -1);
                t.translate(0, -h);
            }
            case 5 -> {
                t.rotate(Math.PI / 2);
                t.scale(1, -1);
            }
            case 6 -> {
                t.translate(h, 0);
                t.rotate(Math.PI / 2);
            }
            case 7 -> {
                t.scale(-1, 1);
                t.translate(-h, 0);
                t.translate(0, w);
                t.rotate(3 * Math.PI / 2);
            }
            case 8 -> {
                t.translate(0, w);
                t.rotate(3 * Math.PI / 2);
            }
            default -> {
                return src;
            }
        }
        BufferedImage out = new BufferedImage(sideways ? h : w, sideways ? w : h, type(src));
        // Через Graphics2D, а не AffineTransformOp.filter: тот отказывается
        // («Unable to transform src image»), когда приёмник другого размера, —
        // а при повороте на 90° он всегда другого.
        var g = out.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.drawImage(src, t, null);
        g.dispose();
        return out;
    }

    private static BufferedImage fit(BufferedImage src) {
        int w = src.getWidth();
        int h = src.getHeight();
        int longest = Math.max(w, h);
        if (longest <= MAX_SIDE) {
            return src; // мелкое не растягиваем: это добавило бы вес и убрало резкость
        }
        double scale = (double) MAX_SIDE / longest;
        int nw = Math.max(1, (int) Math.round(w * scale));
        int nh = Math.max(1, (int) Math.round(h * scale));
        BufferedImage out = new BufferedImage(nw, nh, type(src));
        var g = out.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.drawImage(src, 0, 0, nw, nh, null);
        g.dispose();
        return out;
    }

    private static int type(BufferedImage src) {
        return src.getColorModel().hasAlpha() ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB;
    }

    private static boolean hasTransparentPixel(BufferedImage img) {
        for (int y = 0; y < img.getHeight(); y++) {
            for (int x = 0; x < img.getWidth(); x++) {
                if ((img.getRGB(x, y) >>> 24) < 255) {
                    return true;
                }
            }
        }
        return false;
    }

    /** JPEG альфы не знает: непрозрачную ARGB-картинку кладём на белое и отдаём как RGB. */
    private static BufferedImage flatten(BufferedImage src) {
        if (src.getType() == BufferedImage.TYPE_INT_RGB) {
            return src;
        }
        BufferedImage out = new BufferedImage(src.getWidth(), src.getHeight(), BufferedImage.TYPE_INT_RGB);
        var g = out.createGraphics();
        g.setColor(java.awt.Color.WHITE);
        g.fillRect(0, 0, src.getWidth(), src.getHeight());
        g.drawImage(src, 0, 0, null);
        g.dispose();
        return out;
    }

    private static byte[] writeJpeg(BufferedImage img) {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpeg");
        if (!writers.hasNext()) {
            throw new IllegalStateException("no JPEG writer in this JVM");
        }
        ImageWriter writer = writers.next();
        try (ByteArrayOutputStream bytes = new ByteArrayOutputStream();
             ImageOutputStream stream = ImageIO.createImageOutputStream(bytes)) {
            writer.setOutput(stream);
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(JPEG_QUALITY);
            // Метаданные не переносим НАМЕРЕННО: третий аргумент IIOImage — null,
            // то есть в файл уходит один растр. Так из кадра уходят координаты съёмки.
            writer.write(null, new IIOImage(img, null, null), param);
            stream.flush();
            return bytes.toByteArray();
        } catch (Exception e) {
            throw new BadRequestException(UploadMessages.UNREADABLE_IMAGE);
        } finally {
            writer.dispose();
        }
    }

    private static byte[] writePng(BufferedImage img) {
        try (ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
            ImageIO.write(img, "png", bytes);
            return bytes.toByteArray();
        } catch (Exception e) {
            throw new BadRequestException(UploadMessages.UNREADABLE_IMAGE);
        }
    }
}
