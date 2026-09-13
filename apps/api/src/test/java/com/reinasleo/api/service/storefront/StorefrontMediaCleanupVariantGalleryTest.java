package com.reinasleo.api.service.storefront;

import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.ProductModel;
import com.reinasleo.api.repository.ProductModelRepository;
import com.reinasleo.api.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Панель медиа (feat/admin-media) шлёт gallery/image цветового варианта тем
 * же PUT, что и раньше (`saveVariantDraft` → `saveModelDraft`) — новых полей
 * и новых ручек не заводилось. Этот класс НЕ меняет
 * {@link StorefrontMediaCleaner}: он доказывает, что существующий механизм
 * уже правильно читает variant.image/variant.gallery через
 * {@link StorefrontMapping#media(com.reinasleo.api.dto.admin.storefront.StorefrontVariantRequest)}
 * — то есть менять уборку под эту ветку не потребовалось, а самое опасное
 * место задачи (см. task-admin-media-brief.md) прошло проверку без
 * изменений в проде.
 *
 * Три факта, зеркально StorefrontMediaCleanupTest (та же техника: реальные
 * файлы в /tmp/test-uploads, admin-сервис как единственный вход):
 *   • открепление кадра в черновике не трогает диск, пока не опубликовано;
 *   • публикация убирает кадр, на который больше никто не ссылается;
 *   • кадр, общий для двух вариантов модели, публикацию одного не переживает
 *     только если действительно больше никем не используется — то есть
 *     живёт, пока ссылается хоть один.
 */
@SpringBootTest
@ActiveProfiles("test")
class StorefrontMediaCleanupVariantGalleryTest {

    private static final Path UPLOADS = Paths.get("/tmp/test-uploads").toAbsolutePath().normalize();

    @Autowired private StorefrontAdminService admin;
    @Autowired private ProductModelRepository models;
    @Autowired private ProductRepository products;

    private UUID modelId;

    @BeforeEach
    void setUp() throws Exception {
        products.deleteAll();
        models.deleteAll();
        Files.createDirectories(UPLOADS.resolve("products"));

        ProductModel model = new ProductModel();
        model.setModelKey(9001);
        model.setSlug("gallery-cleanup-" + UUID.randomUUID());
        model.setNameRu("Тест галереи");
        model.setNameEn("Gallery test");
        model.setCategory("outerwear");
        model.setDescRu("описание");
        model.setDescEn("description");
        model.setCompositionRu("шерсть");
        model.setCompositionEn("wool");
        model.setCareRu("уход");
        model.setCareEn("care");
        model.setSizes(new String[]{"S"});
        model.setImage("/images/white/coat.jpg");
        modelId = models.save(model).getId();

        // gal-a и gal-b оба стартуют ОПУБЛИКОВАННЫМИ (не черновиком) с
        // shared.jpg в галерее — ровно так, как выглядела бы карточка ДО
        // того, как владелец открыл новую панель и начал её править.
        products.save(variant("gal-a", 0, "/uploads/products/cover-a.jpg",
                "[{\"src\":\"/uploads/products/only-a.jpg\"},{\"src\":\"/uploads/products/shared.jpg\"}]"));
        products.save(variant("gal-b", 1, "/uploads/products/cover-b.jpg",
                "[{\"src\":\"/uploads/products/shared.jpg\"}]"));

        write("cover-a.jpg");
        write("cover-b.jpg");
        write("only-a.jpg");
        write("shared.jpg");
    }

    private Product variant(String id, int order, String image, String imagesJson) {
        Product p = new Product();
        p.setId(id);
        p.setModelId(modelId);
        p.setTitle("вариант " + id);
        p.setColorKey("k" + order);
        p.setColorHex("#000000");
        p.setPrice(new BigDecimal("1000"));
        p.setImage(image);
        p.setImages(imagesJson);
        p.setSortOrder(order);
        p.setActive(true);
        return p;
    }

    private static void write(String name) throws Exception {
        Files.write(UPLOADS.resolve("products").resolve(name), new byte[]{1, 2, 3});
    }

    private static boolean exists(String name) {
        return Files.exists(UPLOADS.resolve("products").resolve(name));
    }

    @Test
    void draftRemovalDoesNotDeleteAPublishedGalleryImage() throws Exception {
        // Открепили only-a.jpg от галереи gal-a — но это ЧЕРНОВИК, а
        // only-a.jpg ещё стоит в ОПУБЛИКОВАННОЙ колонке.
        admin.saveVariantDraft("gal-a", "{\"gallery\":[\"/uploads/products/shared.jpg\"]}");

        assertThat(exists("only-a.jpg"))
                .as("это ещё черновик — на витрине кадр живой, стирать рано (решение №1 из брифа)")
                .isTrue();
    }

    @Test
    void publishingRemovesAGalleryImageNobodyReferencesAnymore() throws Exception {
        admin.saveVariantDraft("gal-a", "{\"gallery\":[\"/uploads/products/shared.jpg\"]}");

        admin.publishModel(modelId);

        assertThat(exists("only-a.jpg")).as("после публикации на кадр никто не ссылается").isFalse();
        assertThat(exists("shared.jpg")).as("shared.jpg всё ещё в галерее gal-a и gal-b").isTrue();
        assertThat(exists("cover-a.jpg")).as("публикация не трогает то, что не открепляли").isTrue();
    }

    @Test
    void aGalleryImageStillUsedByAnotherVariantSurvivesPublish() throws Exception {
        // Открепляем shared.jpg от gal-a (только у него), gal-b его не трогает.
        admin.saveVariantDraft("gal-a", "{\"gallery\":[\"/uploads/products/only-a.jpg\"]}");

        admin.publishModel(modelId);

        assertThat(exists("shared.jpg"))
                .as("gal-b всё ещё ссылается на файл — уборка не имеет права его снести")
                .isTrue();
        assertThat(exists("only-a.jpg")).as("only-a.jpg остался в галерее gal-a").isTrue();
    }

    @Test
    void discardingADraftRemovalRestoresNothingToDeleteBecauseNothingWasRemoved() throws Exception {
        // Отмена черновика — решение №1 работает и в обратную сторону:
        // открепили, передумали, отменили — файл всё это время был жив.
        admin.saveVariantDraft("gal-a", "{\"gallery\":[]}");
        admin.discardModelDraft(modelId);

        assertThat(exists("only-a.jpg")).isTrue();
        assertThat(exists("shared.jpg")).isTrue();
    }
}
