package com.reinasleo.api.controller;

import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.UserRepository;
import com.reinasleo.api.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FileUploadControllerTest {

    // Настоящий маленький JPEG, а не заглушка из магических байт: ручка теперь
    // РАЗБИРАЕТ картинку (поворот, уменьшение, сброс метаданных), и на заглушке
    // все тесты падали бы на разборе, так и не дойдя до того, что проверяют.
    private static final byte[] TINY_JPEG = jpeg(64, 48);

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;

    private String adminToken;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        String hash = passwordEncoder.encode("Sup3rSecret!");
        User admin = new User(
                "admin-upload@example.com",
                "Admin",
                "Of-Upload",
                hash,
                LocalDate.of(1990, 1, 1),
                false,
                true
        );
        admin.setRole("admin");
        admin = userRepository.save(admin);
        adminToken = jwtService.generateToken(admin.getId(), admin.getEmail());
    }

    private MockMultipartFile fileWithName(String filename) {
        return new MockMultipartFile("file", filename, "image/jpeg", TINY_JPEG);
    }

    @Test
    void upload_withDotDotFilename_returns400() throws Exception {
        mockMvc.perform(multipart("/api/admin/upload")
                        .file(fileWithName("../../../etc/passwd"))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void upload_withAbsolutePathFilename_returns400() throws Exception {
        // Browsers never send an absolute path through multipart. Reject outright
        // rather than silently basenaming, so attackers can't plant arbitrary
        // basenames in the upload dir.
        mockMvc.perform(multipart("/api/admin/upload")
                        .file(fileWithName("/etc/passwd"))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void upload_withWindowsTraversal_returns400() throws Exception {
        mockMvc.perform(multipart("/api/admin/upload")
                        .file(fileWithName("..\\..\\windows\\system32.jpg"))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void upload_withUrlEncodedTraversal_returns400() throws Exception {
        // %2e%2e%2f is not decoded by the server-side sanitiser; the literal
        // sequence fails the alphanumeric whitelist.
        mockMvc.perform(multipart("/api/admin/upload")
                        .file(fileWithName("..%2F..%2Fetc%2Fpasswd"))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void upload_withValidImage_returns200AndStaysInUploadDir() throws Exception {
        String response = mockMvc.perform(multipart("/api/admin/upload")
                        .file(fileWithName("photo.jpg"))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value(org.hamcrest.Matchers.startsWith("/uploads/products/")))
                .andReturn().getResponse().getContentAsString();
        assertThat(response).contains("/uploads/products/");

        // Confirm the file landed strictly under /tmp/test-uploads/products.
        Path uploadRoot = Paths.get("/tmp/test-uploads/products").toAbsolutePath().normalize();
        assertThat(Files.isDirectory(uploadRoot)).isTrue();
        try (Stream<Path> entries = Files.list(uploadRoot)) {
            assertThat(entries.allMatch(p -> p.toAbsolutePath().normalize().startsWith(uploadRoot))).isTrue();
        }
    }

    @Test
    void upload_withoutAuth_returns403() throws Exception {
        mockMvc.perform(multipart("/api/admin/upload")
                        .file(fileWithName("photo.jpg")))
                .andExpect(status().isForbidden());
    }

    @Test
    void upload_withLeadingDotFilename_returns400() throws Exception {
        // Hidden-file naming like .htaccess / .env must not slip through even
        // though the result has a perfectly fine extension.
        mockMvc.perform(multipart("/api/admin/upload")
                        .file(fileWithName(".htaccess"))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void upload_persistedFilename_isUuidPrefixed_notAttackerControlled() throws Exception {
        // The final path is a fresh UUID, never the attacker's filename. This
        // is a structural defence against per-user dir spraying / overwrites.
        String json = mockMvc.perform(multipart("/api/admin/upload")
                        .file(fileWithName("photo.jpg"))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        // url shape: "/uploads/products/<uuid>.jpg"
        String prefix = "/uploads/products/";
        int idx = json.indexOf(prefix);
        assertThat(idx).isGreaterThan(-1);
        String url = json.substring(idx + prefix.length(), json.indexOf('"', idx + prefix.length()));
        String uuidPart = url.contains(".") ? url.substring(0, url.lastIndexOf('.')) : url;
        // UUID.fromString throws if not a valid UUID — proves no echo of attacker name.
        UUID.fromString(uuidPart);
    }

    private static byte[] jpeg(int w, int h) {
        java.awt.image.BufferedImage img = new java.awt.image.BufferedImage(w, h, java.awt.image.BufferedImage.TYPE_INT_RGB);
        java.awt.Graphics2D g = img.createGraphics();
        g.setColor(java.awt.Color.GRAY);
        g.fillRect(0, 0, w, h);
        g.dispose();
        return encode(img, "jpeg");
    }

    /**
     * Кадр с телефона: 24 Мп шума. Шум, а не заливка, — иначе JPEG сожмёт его в
     * килобайты и «тяжёлый снимок» перестанет быть тяжёлым. Размер подобран так,
     * чтобы файл заведомо не прошёл ПРЕЖНИЙ предел в 10 МБ.
     *
     * Пишется прямо в заднюю решётку DataBufferInt через SplittableRandom, а
     * не 24 млн вызовов setRGB(x, y, random.nextInt(...)). Измерено: разница
     * не в setRGB — тот у TYPE_INT_RGB и сам по себе быстрый, — а в
     * java.util.Random.next(): он синхронизирован через CAS на AtomicLong, и
     * этот CAS почти незаметен рядом с вызовом setRGB, зато становится узким
     * местом (~10× медленнее), когда рядом с ним только запись в массив.
     * SplittableRandom синхронизации не делает вовсе — с ним быстрее и голый
     * массив (миллисекунды вместо секунд на 24 млн пикселей). Тот же настоящий
     * шум, тот же настоящий вес, другой — только источник случайности.
     */
    private static byte[] heavyPhoto() {
        java.awt.image.BufferedImage img = new java.awt.image.BufferedImage(6000, 4000, java.awt.image.BufferedImage.TYPE_INT_RGB);
        int[] pixels = ((java.awt.image.DataBufferInt) img.getRaster().getDataBuffer()).getData();
        java.util.SplittableRandom random = new java.util.SplittableRandom(7);
        for (int i = 0; i < pixels.length; i++) {
            pixels[i] = random.nextInt() & 0xFFFFFF;
        }
        return encode(img, "jpeg");
    }

    private static byte[] encode(java.awt.image.BufferedImage img, String format) {
        try {
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            javax.imageio.ImageIO.write(img, format, out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static java.nio.file.Path onlyUploaded(String url) {
        return Paths.get("/tmp/test-uploads/products", url.substring(url.lastIndexOf('/') + 1));
    }

    private static String urlFrom(String json) {
        int at = json.indexOf("/uploads/products/");
        return json.substring(at, json.indexOf('"', at));
    }

    // ============================================================ снимок с телефона

    @Test
    void aHeavyPhoneShotIsAcceptedAndLandsOnTheStorefrontLight() throws Exception {
        byte[] photo = heavyPhoto();
        assertThat(photo.length).isGreaterThan(10 * 1024 * 1024); // прежний предел он бы не прошёл

        String json = mockMvc.perform(multipart("/api/admin/upload")
                        .file(new MockMultipartFile("file", "IMG_0421.JPG", "image/jpeg", photo))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        java.nio.file.Path saved = onlyUploaded(urlFrom(json));
        assertThat(Files.exists(saved)).isTrue();
        // Проверяем сам файл, а не код ответа: и вес, и стороны.
        assertThat(Files.size(saved)).isLessThan(photo.length / 4);
        java.awt.image.BufferedImage stored = javax.imageio.ImageIO.read(saved.toFile());
        assertThat(Math.max(stored.getWidth(), stored.getHeight())).isEqualTo(2000);
        assertThat(stored.getWidth()).isEqualTo(2000);
        assertThat(stored.getHeight()).isEqualTo(1333); // пропорции 3:2 сохранены
    }

    @Test
    void aBrokenFileIsRefusedWithWordsNotAFiveHundred() throws Exception {
        // Магические байты JPEG есть, картинки за ними нет — ровно то, что
        // приезжает от недокачанного файла.
        byte[] broken = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10, 'J', 'F', 'I', 'F', 0, 1};

        mockMvc.perform(multipart("/api/admin/upload")
                        .file(new MockMultipartFile("file", "broken.jpg", "image/jpeg", broken))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", org.hamcrest.Matchers.containsString("разобрать картинку")));
    }

    @Test
    void aShotTakenSidewaysIsStoredUpright() throws Exception {
        // Ориентация 6 — телефон снял вертикально, пиксели лежат горизонтально.
        byte[] sideways = withOrientationSix(jpeg(400, 200));

        String json = mockMvc.perform(multipart("/api/admin/upload")
                        .file(new MockMultipartFile("file", "IMG_0422.JPG", "image/jpeg", sideways))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        java.awt.image.BufferedImage stored = javax.imageio.ImageIO.read(onlyUploaded(urlFrom(json)).toFile());
        assertThat(stored.getWidth()).isEqualTo(200);
        assertThat(stored.getHeight()).isEqualTo(400);
    }

    @Test
    void anImageHeavierThanTheCeilingIsRefusedInWords() throws Exception {
        byte[] huge = new byte[33 * 1024 * 1024];
        huge[0] = (byte) 0xFF;
        huge[1] = (byte) 0xD8;
        huge[2] = (byte) 0xFF;

        mockMvc.perform(multipart("/api/admin/upload")
                        .file(new MockMultipartFile("file", "huge.jpg", "image/jpeg", huge))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", org.hamcrest.Matchers.containsString("32 МБ")));
    }

    // ============================================================ тип по байтам, не по заявленному

    @Test
    void aRealWebpIsRefusedWithItsOwnWords() throws Exception {
        // Настоящий RIFF/WEBP — минимальный, ровно на границе сигнатуры.
        // Решение владельца: WebP не принимаем вовсе (см. UploadMessages), а не
        // вычищаем метаданные — переписывание чужого файла обратно на диск это
        // не чтение чужого бинаря, а его производство, и ошибиться в записи
        // дороже, чем в разборе.
        byte[] webp = {
                'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P',
        };

        mockMvc.perform(multipart("/api/admin/upload")
                        .file(new MockMultipartFile("file", "photo.webp", "image/webp", webp))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", org.hamcrest.Matchers.containsString("JPEG")))
                .andExpect(jsonPath("$.message", org.hamcrest.Matchers.containsString("PNG")));
    }

    @Test
    void aJpegNamedWebpIsRefusedAsAMismatchNotAsAPassthrough() throws Exception {
        // Ручка когда-то решала «жать или пропустить» по ЗАЯВЛЕННОМУ типу:
        // JPEG, названный image/webp, миновал бы и уменьшение, и сброс
        // метаданных. Тип теперь определяется по байтам — настоящий JPEG,
        // назвавшийся webp, получает отказ за расхождение, а не проезжает как
        // «пропустить, нечем жать».
        mockMvc.perform(multipart("/api/admin/upload")
                        .file(new MockMultipartFile("file", "photo.webp", "image/webp", TINY_JPEG))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void aPngNamedJpegIsRefusedAsAMismatch() throws Exception {
        byte[] png = encode(newPngImage(20, 20), "png");

        mockMvc.perform(multipart("/api/admin/upload")
                        .file(new MockMultipartFile("file", "photo.jpg", "image/jpeg", png))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    private static java.awt.image.BufferedImage newPngImage(int w, int h) {
        java.awt.image.BufferedImage img = new java.awt.image.BufferedImage(w, h, java.awt.image.BufferedImage.TYPE_INT_RGB);
        java.awt.Graphics2D g = img.createGraphics();
        g.setColor(java.awt.Color.BLUE);
        g.fillRect(0, 0, w, h);
        g.dispose();
        return img;
    }

    private static byte[] withOrientationSix(byte[] jpeg) {
        byte[] tiff = new byte[]{
                'I', 'I', 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
                0x01, 0x00,
                0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00,
                0x06, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00,
        };
        int payload = 6 + tiff.length;
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
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
}
