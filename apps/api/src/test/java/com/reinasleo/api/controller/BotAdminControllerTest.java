package com.reinasleo.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * `/api/bot/admin/upload` — вторая дверь в тот же каталог, что и
 * `/api/admin/upload` (FileUploadControllerTest): один физический путь на
 * диске, один публичный адрес отдачи. Проверяем ровно то же самое, что и у
 * соседа, только со своим секретом вместо Bearer-токена.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BotAdminControllerTest {

    private static final String BOT_SECRET = "test-bot-secret";

    @Autowired private MockMvc mockMvc;

    @Test
    void aPhotoWithShootingMetadataLandsWithoutItThroughTheBotRoute() throws Exception {
        byte[] withMetadata = withExifOrientation(jpeg(400, 300));
        assertThat(hasExif(withMetadata)).isTrue();

        String json = mockMvc.perform(multipart("/api/bot/admin/upload")
                        .file(new MockMultipartFile("file", "photo.jpg", "image/jpeg", withMetadata))
                        .header("X-Bot-Secret", BOT_SECRET))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        byte[] stored = Files.readAllBytes(savedFile(json));
        assertThat(hasExif(stored)).isFalse();
    }

    @Test
    void aRealWebpIsRefused() throws Exception {
        byte[] webp = {'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'};

        mockMvc.perform(multipart("/api/bot/admin/upload")
                        .file(new MockMultipartFile("file", "photo.webp", "image/webp", webp))
                        .header("X-Bot-Secret", BOT_SECRET))
                .andExpect(status().isBadRequest());
    }

    @Test
    void aJpegDeclaredAsPngIsRefusedAsAMismatch() throws Exception {
        byte[] realJpeg = jpeg(64, 48);

        mockMvc.perform(multipart("/api/bot/admin/upload")
                        .file(new MockMultipartFile("file", "photo.png", "image/png", realJpeg))
                        .header("X-Bot-Secret", BOT_SECRET))
                .andExpect(status().isBadRequest());
    }

    @Test
    void aPhotoOverTwoThousandPixelsIsShrunkOnDisk() throws Exception {
        byte[] big = jpeg(2400, 1600);

        String json = mockMvc.perform(multipart("/api/bot/admin/upload")
                        .file(new MockMultipartFile("file", "big.jpg", "image/jpeg", big))
                        .header("X-Bot-Secret", BOT_SECRET))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        BufferedImage stored = javax.imageio.ImageIO.read(savedFile(json).toFile());
        assertThat(Math.max(stored.getWidth(), stored.getHeight())).isEqualTo(2000);
        assertThat(stored.getWidth()).isEqualTo(2000);
        assertThat(stored.getHeight()).isEqualTo(1333); // пропорции 3:2 сохранены
    }

    // ---------------------------------------------------------------- фикстуры

    private static byte[] jpeg(int w, int h) {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(Color.GRAY);
        g.fillRect(0, 0, w, h);
        g.dispose();
        return encode(img);
    }

    private static byte[] encode(BufferedImage img) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            javax.imageio.ImageIO.write(img, "jpeg", out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    /** Вклеивает APP1 с Exif/TIFF (координаты живут в том же блоке на настоящем снимке) сразу за SOI. */
    private static byte[] withExifOrientation(byte[] jpeg) {
        byte[] tiff = new byte[]{
                'I', 'I', 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
                0x01, 0x00,
                0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00,
                0x01, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00,
        };
        int payload = 6 + tiff.length;
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(jpeg[0]);
        out.write(jpeg[1]);
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

    private static Path savedFile(String json) throws Exception {
        String url = new ObjectMapper().readTree(json).get("url").asText();
        return Paths.get("/tmp/test-uploads", url.substring("/uploads/".length()));
    }
}
