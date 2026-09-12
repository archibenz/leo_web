package com.reinasleo.api.service.storefront;

import com.reinasleo.api.model.StorefrontSection;
import com.reinasleo.api.repository.ProductModelRepository;
import com.reinasleo.api.repository.ProductRepository;
import com.reinasleo.api.repository.ProductSetItemRepository;
import com.reinasleo.api.repository.ProductSetRepository;
import com.reinasleo.api.repository.StorefrontSectionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * «Загрузил — передумал — отменил» не должно оставлять файл навсегда. Уборка
 * нужна в трёх местах: при замене файла в черновике, при отмене черновика и
 * при публикации (старый файл).
 */
@SpringBootTest
@ActiveProfiles("test")
class StorefrontMediaCleanupTest {

    private static final Path UPLOADS = Paths.get("/tmp/test-uploads").toAbsolutePath().normalize();

    @Autowired private StorefrontAdminService admin;
    @Autowired private StorefrontMediaCleaner cleaner;
    @Autowired private StorefrontSectionRepository sections;
    @Autowired private ProductSetItemRepository setItems;
    @Autowired private ProductSetRepository sets;
    @Autowired private ProductRepository products;
    @Autowired private ProductModelRepository models;

    private UUID sectionId;

    @BeforeEach
    void setUp() throws Exception {
        setItems.deleteAll();
        sets.deleteAll();
        sections.deleteAll();
        products.deleteAll();
        models.deleteAll();
        Files.createDirectories(UPLOADS.resolve("video"));

        StorefrontSection section = new StorefrontSection();
        section.setSlug("aw26-hero");
        section.setLayout("hero");
        section.setStatus("active");
        section.setNameRu("Осень");
        section.setNameEn("Autumn");
        section.setVideoUrl("/uploads/video/published.mp4");
        sectionId = sections.save(section).getId();

        write("published.mp4");
    }

    private static void write(String name) throws Exception {
        Files.write(UPLOADS.resolve("video").resolve(name), new byte[]{1, 2, 3});
    }

    private static boolean exists(String name) {
        return Files.exists(UPLOADS.resolve("video").resolve(name));
    }

    @Test
    void replacingAFileInsideADraftRemovesTheOneItReplaced() throws Exception {
        write("first.mp4");
        write("second.mp4");

        admin.saveSectionDraft(sectionId, "{\"videoUrl\":\"/uploads/video/first.mp4\"}");
        assertThat(exists("first.mp4")).isTrue();

        admin.saveSectionDraft(sectionId, "{\"videoUrl\":\"/uploads/video/second.mp4\"}");

        assertThat(exists("first.mp4")).as("замена в черновике убирает за собой").isFalse();
        assertThat(exists("second.mp4")).isTrue();
        assertThat(exists("published.mp4")).as("опубликованное видео трогать нельзя").isTrue();
    }

    @Test
    void discardingADraftRemovesWhatItHadUploaded() throws Exception {
        write("abandoned.mp4");

        admin.saveSectionDraft(sectionId, "{\"videoUrl\":\"/uploads/video/abandoned.mp4\"}");
        admin.discardSectionDraft(sectionId);

        assertThat(exists("abandoned.mp4")).isFalse();
        assertThat(exists("published.mp4")).isTrue();
    }

    @Test
    void publishingRemovesTheFileItReplaced() throws Exception {
        write("fresh.mp4");

        admin.saveSectionDraft(sectionId, "{\"videoUrl\":\"/uploads/video/fresh.mp4\"}");
        admin.publishSection(sectionId);

        assertThat(exists("published.mp4")).as("старое видео после публикации не нужно").isFalse();
        assertThat(exists("fresh.mp4")).isTrue();
        assertThat(sections.findById(sectionId).orElseThrow().getVideoUrl())
                .isEqualTo("/uploads/video/fresh.mp4");
    }

    @Test
    void aFileStillUsedSomewhereElseSurvives() throws Exception {
        StorefrontSection other = new StorefrontSection();
        other.setSlug("sets-teaser");
        other.setLayout("sets-teaser");
        other.setStatus("active");
        other.setNameRu("Сеты");
        other.setNameEn("Sets");
        other.setVideoUrl("/uploads/video/published.mp4");
        sections.save(other);

        admin.saveSectionDraft(sectionId, "{\"videoUrl\":\"/uploads/video/replacement.mp4\"}");
        write("replacement.mp4");
        admin.publishSection(sectionId);

        assertThat(exists("published.mp4")).as("на файл ссылается второй блок — он живой").isTrue();
    }

    @Test
    void filesOutsideUploadsAreNeverOurs() throws Exception {
        Files.createDirectories(UPLOADS.resolve("videos/white"));
        Path repoAsset = UPLOADS.resolve("videos/white/hero.mp4");
        Files.write(repoAsset, new byte[]{1});

        cleaner.forget(List.of("/videos/white/hero.mp4", "/images/white/hero.jpg"));

        assertThat(Files.exists(repoAsset)).as("/videos и /images — файлы сборки витрины, не наши").isTrue();
    }
}
