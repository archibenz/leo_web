package com.reinasleo.api.util;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * ffmpeg на сервере нет и не будет, поэтому кодек определяем разбором
 * заголовка контейнера. Тест держит разбор честным: синтетические коробки
 * MP4 проверяют сам обход, а настоящие ролики витрины — что обход работает
 * на файлах, которые на витрине и лежат.
 */
class VideoContentValidatorTest {

    // ------------------------------------------------------------ сборка коробок MP4

    private static byte[] box(String type, byte[] body) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        int size = 8 + body.length;
        out.write(size >>> 24);
        out.write(size >>> 16);
        out.write(size >>> 8);
        out.write(size);
        out.writeBytes(type.getBytes(StandardCharsets.US_ASCII));
        out.writeBytes(body);
        return out.toByteArray();
    }

    private static byte[] concat(byte[]... parts) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        for (byte[] p : parts) {
            out.writeBytes(p);
        }
        return out.toByteArray();
    }

    private static byte[] stsd(String format) {
        ByteArrayOutputStream body = new ByteArrayOutputStream();
        body.writeBytes(new byte[]{0, 0, 0, 0});           // version + flags
        body.writeBytes(new byte[]{0, 0, 0, 1});           // entry_count = 1
        byte[] entry = box(format, new byte[78]);          // минимальная VisualSampleEntry
        body.writeBytes(entry);
        return box("stsd", body.toByteArray());
    }

    private static byte[] mp4(String format) {
        byte[] ftyp = box("ftyp", concat("isom".getBytes(StandardCharsets.US_ASCII),
                new byte[]{0, 0, 2, 0}, "isomavc1".getBytes(StandardCharsets.US_ASCII)));
        byte[] moov = box("moov", box("trak", box("mdia", box("minf", box("stbl", stsd(format))))));
        return concat(ftyp, box("mdat", new byte[16]), moov);
    }

    private static byte[] webm(String codecId) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.writeBytes(new byte[]{0x1A, 0x45, (byte) 0xDF, (byte) 0xA3});
        out.writeBytes("webm".getBytes(StandardCharsets.US_ASCII));
        out.write(0x86);                                   // CodecID
        byte[] id = codecId.getBytes(StandardCharsets.US_ASCII);
        out.write(0x80 | id.length);
        out.writeBytes(id);
        return out.toByteArray();
    }

    // ------------------------------------------------------------ разбор

    @Test
    void h264InsideMp4IsRecognised() {
        assertThat(VideoContentValidator.probe(mp4("avc1")).codec()).isEqualTo("avc1");
        assertThat(VideoContentValidator.probe(mp4("avc3")).codec()).isEqualTo("avc3");
        assertThat(VideoContentValidator.probe(mp4("avc1")).webReady()).isTrue();
    }

    @Test
    void hevcAndAv1InsideMp4AreNotWebReady() {
        // Кодеки с телефона и из генераторов: Safari их покажет, Chrome — нет.
        assertThat(VideoContentValidator.probe(mp4("hvc1")).codec()).isEqualTo("hvc1");
        assertThat(VideoContentValidator.probe(mp4("hvc1")).webReady()).isFalse();
        assertThat(VideoContentValidator.probe(mp4("av01")).webReady()).isFalse();
    }

    @Test
    void mp4WithoutAReadableSampleEntryIsUnknown_notSilentlyAccepted() {
        byte[] ftypOnly = box("ftyp", concat("isom".getBytes(StandardCharsets.US_ASCII), new byte[]{0, 0, 2, 0}));
        VideoContentValidator.Probe probe = VideoContentValidator.probe(ftypOnly);
        assertThat(probe.container()).isEqualTo("mp4");
        assertThat(probe.codec()).isNull();
        assertThat(probe.webReady()).isFalse();
    }

    @Test
    void webmCodecsAreReadFromTheEbmlHeader() {
        assertThat(VideoContentValidator.probe(webm("V_VP9")).codec()).isEqualTo("V_VP9");
        assertThat(VideoContentValidator.probe(webm("V_VP9")).webReady()).isTrue();
        assertThat(VideoContentValidator.probe(webm("V_VP8")).webReady()).isTrue();
    }

    @Test
    void aFileThatIsNeitherMp4NorWebmIsRefused() {
        VideoContentValidator.Probe probe = VideoContentValidator.probe("не видео вовсе".getBytes(StandardCharsets.UTF_8));
        assertThat(probe.container()).isNull();
        assertThat(probe.webReady()).isFalse();
    }

    @Test
    void theRealStorefrontVideosAreRecognisedAsH264() throws Exception {
        // Три ролика витрины лежат в репозитории и по ffprobe все h264. Разбор
        // без ffmpeg обязан сказать то же самое — иначе он бесполезен.
        for (String name : new String[]{"hero-mark2.mp4", "hero-desktop.mp4", "sets-static.mp4"}) {
            Path file = Paths.get("../web/public/videos/white/" + name).toAbsolutePath().normalize();
            Assumptions.assumeTrue(Files.exists(file), "нет файла " + file);
            VideoContentValidator.Probe probe = VideoContentValidator.probe(Files.readAllBytes(file));
            assertThat(probe.container()).as(name).isEqualTo("mp4");
            assertThat(probe.codec()).as(name).isEqualTo("avc1");
            assertThat(probe.webReady()).as(name).isTrue();
        }
    }
}
