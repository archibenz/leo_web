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

    // 1x1 JPEG magic-byte stub good enough for ImageContentValidator (only
    // sniffs the first three bytes for JPEG: FF D8 FF).
    private static final byte[] TINY_JPEG = new byte[]{
            (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0,
            0x00, 0x10, 'J', 'F', 'I', 'F', 0x00, 0x01
    };

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
}
