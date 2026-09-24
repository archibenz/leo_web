package com.reinasleo.api.controller;

import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.ProductModel;
import com.reinasleo.api.model.ProductSet;
import com.reinasleo.api.model.ProductSetItem;
import com.reinasleo.api.model.StorefrontSection;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.ProductModelRepository;
import com.reinasleo.api.repository.ProductRepository;
import com.reinasleo.api.repository.ProductSetItemRepository;
import com.reinasleo.api.repository.ProductSetRepository;
import com.reinasleo.api.repository.StorefrontSectionRepository;
import com.reinasleo.api.repository.UserRepository;
import com.reinasleo.api.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.CacheManager;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class StorefrontAdminControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository users;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;
    @Autowired private ProductModelRepository models;
    @Autowired private ProductRepository products;
    @Autowired private ProductSetRepository sets;
    @Autowired private ProductSetItemRepository setItems;
    @Autowired private StorefrontSectionRepository sections;
    @Autowired private CacheManager caches;

    private String adminToken;
    private String shopperToken;
    private UUID modelId;
    private UUID setId;
    private UUID sectionId;
    private UUID tickerSectionId;

    @BeforeEach
    void setUp() {
        setItems.deleteAll();
        sets.deleteAll();
        sections.deleteAll();
        products.deleteAll();
        models.deleteAll();
        users.deleteAll();
        Objects.requireNonNull(caches.getCache("storefront")).clear();

        adminToken = tokenFor("admin-storefront@example.com", "admin");
        shopperToken = tokenFor("shopper-storefront@example.com", "user");

        ProductModel model = new ProductModel();
        model.setModelKey(2);
        model.setSlug("palto");
        model.setNameRu("Пальто");
        model.setNameEn("Coat");
        model.setCategory("outerwear");
        model.setDescRu("описание");
        model.setDescEn("description");
        model.setCompositionRu("шерсть");
        model.setCompositionEn("wool");
        model.setCareRu("уход");
        model.setCareEn("care");
        model.setSizes(new String[]{"S", "M"});
        model.setImage("/images/white/coat.jpg");
        model.setGallery("[\"/images/white/coat-2.jpg\"]");
        modelId = models.save(model).getId();

        products.save(variant("wb-1", "camel", "25000", 0));
        products.save(variant("wb-2", "black", "23000", 1));

        ProductSet set = new ProductSet();
        set.setKey("coat-lace");
        set.setNameRu("Пальто и кружево");
        set.setNameEn("Coat and Lace");
        set.setDescRu("описание");
        set.setDescEn("description");
        set.setImage("/images/white/set.jpg");
        setId = sets.save(set).getId();
        ProductSetItem item = new ProductSetItem();
        item.setSetId(setId);
        item.setProductId("wb-1");
        item.setPosition(0);
        setItems.save(item);

        StorefrontSection section = new StorefrontSection();
        section.setSlug("aw26-hero");
        section.setLayout("hero");
        section.setStatus("active");
        section.setNameRu("Осень / Зима 2026");
        section.setNameEn("Autumn / Winter 2026");
        section.setHeadlineRu("Точный крой");
        section.setHeadlineEn("Precise cut");
        section.setVideoUrl("/videos/white/hero.mp4");
        sectionId = sections.save(section).getId();

        // sortOrder ПОСЛЕ героя (не -1, как в реальной миграции V33) — нарочно:
        // существующие тесты этого файла читают $.sections[0] как героя, и более
        // ранний sortOrder сдвинул бы им индекс. Порядок для продукта решает V33,
        // а не эта фикстура.
        StorefrontSection ticker = new StorefrontSection();
        ticker.setSlug("home-ticker");
        ticker.setLayout("ticker");
        ticker.setStatus("active");
        ticker.setNameRu("Бегущая строка");
        ticker.setNameEn("Home ticker");
        ticker.setSortOrder(5);
        tickerSectionId = sections.save(ticker).getId();
    }

    private String tokenFor(String email, String role) {
        User user = new User(email, "Имя", "Фамилия", passwordEncoder.encode("Sup3rSecret!"),
                LocalDate.of(1990, 1, 1), false, true);
        user.setRole(role);
        user = users.save(user);
        return jwtService.generateToken(user.getId(), user.getEmail());
    }

    private Product variant(String id, String colour, String price, int order) {
        Product p = new Product();
        p.setId(id);
        p.setModelId(modelId);
        p.setTitle("Пальто " + colour);
        p.setColorKey(colour);
        p.setColorHex("#b89a6e");
        p.setColorNameRu("Кэмел");
        p.setColorNameEn("Camel");
        p.setPrice(new BigDecimal(price));
        p.setImage("/images/white/" + colour + ".jpg");
        p.setImages("[{\"src\":\"/images/white/" + colour + "-2.jpg\",\"alt\":\"\"}]");
        p.setSortOrder(order);
        p.setActive(true);
        return p;
    }

    private void clearStorefrontCache() {
        Objects.requireNonNull(caches.getCache("storefront")).clear();
    }

    // ============================================================ ключевая пара

    @Test
    void savingADraftDoesNotChangeWhatTheStorefrontServes_publishingDoes() throws Exception {
        mockMvc.perform(get("/api/catalog/storefront"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.products[0].price").value(25000));

        mockMvc.perform(put("/api/admin/storefront/models/" + modelId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"variants\":{\"wb-1\":{\"price\":19000}}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.variants['wb-1'].price").value(19000))
                .andExpect(jsonPath("$.variants['wb-2'].price").value(23000));

        // Кэш ни при чём: чистим его руками и всё равно видим опубликованное.
        clearStorefrontCache();
        mockMvc.perform(get("/api/catalog/storefront"))
                .andExpect(jsonPath("$.products[0].price").value(25000))
                .andExpect(jsonPath("$.products[0].colors[0].price").value(25000));

        // Владелец при этом видит свою правку.
        mockMvc.perform(get("/api/admin/storefront/preview")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.products[0].colors[0].price").value(19000));

        // Публикация — и кэш сбрасывает сама, руками его никто не чистит.
        mockMvc.perform(post("/api/admin/storefront/models/" + modelId + "/publish")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/catalog/storefront"))
                .andExpect(jsonPath("$.products[0].price").value(19000))
                .andExpect(jsonPath("$.products[0].colors[0].price").value(19000));

        assertThat(models.findById(modelId).orElseThrow().getDraft()).isNull();
        assertThat(products.findById("wb-1").orElseThrow().getPrice()).isEqualByComparingTo("19000");
    }

    @Test
    void sectionDraftStaysInvisibleUntilPublished() throws Exception {
        mockMvc.perform(put("/api/admin/storefront/sections/" + sectionId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"headlineRu\":\"Новый заголовок\"}"))
                .andExpect(status().isOk());

        clearStorefrontCache();
        mockMvc.perform(get("/api/catalog/storefront"))
                .andExpect(jsonPath("$.sections[0].headlineRu").value("Точный крой"));

        mockMvc.perform(post("/api/admin/storefront/sections/" + sectionId + "/publish")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/catalog/storefront"))
                .andExpect(jsonPath("$.sections[0].headlineRu").value("Новый заголовок"));
    }

    @Test
    void setCompositionIsDraftedAsAnArrayAndPublishedWhole() throws Exception {
        mockMvc.perform(put("/api/admin/storefront/sets/" + setId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"items\":[{\"productId\":\"wb-2\",\"position\":0}]}"))
                .andExpect(status().isOk());

        clearStorefrontCache();
        mockMvc.perform(get("/api/catalog/storefront"))
                .andExpect(jsonPath("$.sets[0].items[0].productId").value("wb-1"));

        mockMvc.perform(post("/api/admin/storefront/sets/" + setId + "/publish")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/catalog/storefront"))
                .andExpect(jsonPath("$.sets[0].items[0].productId").value("wb-2"));
        assertThat(setItems.findBySetIdOrderByPositionAsc(setId)).hasSize(1);
    }

    // ============================================================ проверка при публикации

    @Test
    void publishRefusesADraftThatBreaksTheSameRulesAsADirectWrite() throws Exception {
        // Черновик, положенный в обход ручки (миграция, чужая рука, старая
        // версия редактора). JSONB его принял — публикация обязана отказать.
        ProductModel model = models.findById(modelId).orElseThrow();
        model.setDraft("{\"nameRu\":\"\"}");
        models.saveAndFlush(model);

        mockMvc.perform(post("/api/admin/storefront/models/" + modelId + "/publish")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());

        assertThat(models.findById(modelId).orElseThrow().getNameRu()).isEqualTo("Пальто");
        clearStorefrontCache();
        mockMvc.perform(get("/api/catalog/storefront"))
                .andExpect(jsonPath("$.products[0].ru").value("Пальто"));
    }

    @Test
    void draftWithATypoInTheKeyIsRefused() throws Exception {
        mockMvc.perform(put("/api/admin/storefront/sections/" + sectionId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"headlinRu\":\"опечатка\"}"))
                .andExpect(status().isBadRequest());

        assertThat(sections.findById(sectionId).orElseThrow().getDraft()).isNull();
    }

    @Test
    void draftWithAnImpossibleValueIsRefused() throws Exception {
        mockMvc.perform(put("/api/admin/storefront/models/" + modelId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"variants\":{\"wb-1\":{\"price\":0}}}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(put("/api/admin/storefront/models/" + modelId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"image\":\"https://example.com/hero.jpg\"}"))
                .andExpect(status().isBadRequest());

        assertThat(models.findById(modelId).orElseThrow().getDraft()).isNull();
    }

    // ============================================================ бегущая строка (V33)

    @Test
    void tickerItemValidationRejectsAnExternalHref() throws Exception {
        mockMvc.perform(put("/api/admin/storefront/sections/" + tickerSectionId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"items\":[{\"ru\":\"Скидка\",\"href\":\"https://evil.example.com\"}]}"))
                .andExpect(status().isBadRequest());

        assertThat(sections.findById(tickerSectionId).orElseThrow().getDraft()).isNull();
    }

    @Test
    void tickerItemValidationRejectsAnEmptyRu() throws Exception {
        mockMvc.perform(put("/api/admin/storefront/sections/" + tickerSectionId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"items\":[{\"ru\":\"\"}]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void tickerItemValidationRejectsTextLongerThan160Characters() throws Exception {
        String tooLong = "а".repeat(161);
        mockMvc.perform(put("/api/admin/storefront/sections/" + tickerSectionId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"items\":[{\"ru\":\"" + tooLong + "\"}]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void aValidTickerDraftPublishesAndReachesThePublicStorefront() throws Exception {
        mockMvc.perform(put("/api/admin/storefront/sections/" + tickerSectionId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"items\":[{\"ru\":\"Скидка 20% до воскресенья\",\"en\":\"20% off until Sunday\","
                                + "\"href\":\"/ru/sets\",\"until\":\"2026-09-14\"}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].ru").value("Скидка 20% до воскресенья"));

        clearStorefrontCache();
        // Черновик не виден покупателю — тот же контракт, что и у текста героя.
        mockMvc.perform(get("/api/catalog/storefront"))
                .andExpect(jsonPath("$.sections[1].slug").value("home-ticker"))
                .andExpect(jsonPath("$.sections[1].items").isEmpty());

        mockMvc.perform(post("/api/admin/storefront/sections/" + tickerSectionId + "/publish")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/catalog/storefront"))
                .andExpect(jsonPath("$.sections[1].items[0].ru").value("Скидка 20% до воскресенья"))
                .andExpect(jsonPath("$.sections[1].items[0].href").value("/ru/sets"));
    }

    @Test
    void draftNamingAVariantThatDoesNotExistIsRefused() throws Exception {
        mockMvc.perform(put("/api/admin/storefront/models/" + modelId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"variants\":{\"wb-999\":{\"price\":19000}}}"))
                .andExpect(status().isBadRequest());
    }

    // ============================================================ накопление и отмена

    @Test
    void aSecondEditAddsToTheDraftInsteadOfErasingTheFirst() throws Exception {
        mockMvc.perform(put("/api/admin/storefront/sections/" + sectionId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"headlineRu\":\"Первая правка\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(put("/api/admin/storefront/sections/" + sectionId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"eyebrowRu\":\"Осень\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.headlineRu").value("Первая правка"))
                .andExpect(jsonPath("$.eyebrowRu").value("Осень"));

        mockMvc.perform(get("/api/admin/storefront/drafts")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].kind").value("section"))
                .andExpect(jsonPath("$[0].fields", org.hamcrest.Matchers.containsInAnyOrder(
                        "headlineRu", "eyebrowRu")));
    }

    @Test
    void discardingADraftLeavesThePublishedRowAlone() throws Exception {
        mockMvc.perform(put("/api/admin/storefront/models/" + modelId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nameRu\":\"Пальто новое\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/admin/storefront/models/" + modelId + "/draft")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nameRu").value("Пальто"));

        assertThat(models.findById(modelId).orElseThrow().getDraft()).isNull();
        clearStorefrontCache();
        mockMvc.perform(get("/api/catalog/storefront"))
                .andExpect(jsonPath("$.products[0].ru").value("Пальто"));
    }

    @Test
    void publishingNothingIsNotAnError() throws Exception {
        mockMvc.perform(post("/api/admin/storefront/models/" + modelId + "/publish")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nameRu").value("Пальто"));
    }

    // ============================================================ доступ

    @Test
    void writingTheStorefrontIsAdminOnly() throws Exception {
        mockMvc.perform(put("/api/admin/storefront/models/" + modelId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nameRu\":\"Чужое\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/admin/storefront/models/" + modelId)
                        .header("Authorization", "Bearer " + shopperToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nameRu\":\"Чужое\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/storefront/preview")
                        .header("Authorization", "Bearer " + shopperToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void variantEndpointWritesIntoTheDraftOfItsModel() throws Exception {
        mockMvc.perform(put("/api/admin/storefront/products/wb-1")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"stockQuantity\":7}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.variants['wb-1'].stockQuantity").value(7));

        // Черновика на самой строке products нет и быть не может — он внутри модели.
        assertThat(models.findById(modelId).orElseThrow().getDraft()).contains("wb-1");
        assertThat(products.findById("wb-1").orElseThrow().getStockQuantity()).isZero();

        mockMvc.perform(post("/api/admin/storefront/models/" + modelId + "/publish")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        assertThat(products.findById("wb-1").orElseThrow().getStockQuantity()).isEqualTo(7);
    }

    @Test
    void previewIsNeverServedFromTheStorefrontCache() throws Exception {
        mockMvc.perform(get("/api/catalog/storefront")).andExpect(status().isOk());

        mockMvc.perform(put("/api/admin/storefront/sections/" + sectionId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"headlineRu\":\"Свежий черновик\"}"))
                .andExpect(status().isOk());

        // Кэш «storefront» сейчас прогрет опубликованным — предпросмотр обязан
        // мимо него пройти, иначе владелец увидит протухшее и опубликует вслепую.
        mockMvc.perform(get("/api/admin/storefront/preview")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sections[0].headlineRu").value("Свежий черновик"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers
                        .header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")));
    }

    @Test
    void publishedStorefrontNeverContainsDraftValues() throws Exception {
        mockMvc.perform(put("/api/admin/storefront/models/" + modelId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nameRu\":\"ЧЕРНОВИК\",\"nameEn\":\"DRAFT\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(put("/api/admin/storefront/sets/" + setId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nameRu\":\"ЧЕРНОВИК\"}"))
                .andExpect(status().isOk());

        clearStorefrontCache();
        String body = mockMvc.perform(get("/api/catalog/storefront"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("ЧЕРНОВИК").doesNotContain("DRAFT");
    }

    @Test
    void drafRowsAreListedWithTheirDottedFieldPaths() throws Exception {
        mockMvc.perform(put("/api/admin/storefront/products/wb-1")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"price\":19000}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/storefront/drafts")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", org.hamcrest.Matchers.hasSize(1)))
                .andExpect(jsonPath("$[0].kind").value("model"))
                .andExpect(jsonPath("$[0].key").value("palto"))
                .andExpect(jsonPath("$[0].fields[0]").value("variants.wb-1.price"));
    }

    @Test
    void unknownRowAnswers404() throws Exception {
        mockMvc.perform(put("/api/admin/storefront/sections/" + UUID.randomUUID())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"headlineRu\":\"нет такого блока\"}"))
                .andExpect(status().isNotFound());

        assertThat(List.of()).isEmpty();
    }

    // ============================================================ сломанный черновик (lw-sjek)

    // Один нечитаемый черновик не имеет права уносить с собой весь предпросмотр.
    // Раньше уносил: merge бросал BadRequestException, и владелец получал 400
    // вместо страницы — включая исправные правки соседних карточек.

    @Test
    void aBrokenDraftShowsItsRowPublishedAndIsMarked() throws Exception {
        // Достижимо не только правкой базы руками: черновик на вариант плюс
        // удаление этого варианта старой админкой даёт ровно такую строку.
        ProductModel model = models.findById(modelId).orElseThrow();
        model.setDraft("{\"variants\":{\"wb-404\":{\"price\":19000}}}");
        models.saveAndFlush(model);

        mockMvc.perform(get("/api/admin/storefront/preview")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.products[0].ru").value("Пальто"))
                .andExpect(jsonPath("$.products[0].colors", org.hamcrest.Matchers.hasSize(2)))
                .andExpect(jsonPath("$.brokenDrafts", org.hamcrest.Matchers.hasSize(1)))
                .andExpect(jsonPath("$.brokenDrafts[0].kind").value("model"))
                .andExpect(jsonPath("$.brokenDrafts[0].id").value(modelId.toString()))
                .andExpect(jsonPath("$.brokenDrafts[0].key").value("palto"))
                .andExpect(jsonPath("$.brokenDrafts[0].reason", org.hamcrest.Matchers.containsString("wb-404")));
    }

    @Test
    void aBrokenDraftDoesNotLeakThePartOfItselfThatWasAlreadyApplied() throws Exception {
        // Тот случай, ради которого вообще нужен откат. `apply` пишет скалярные
        // поля модели ПЕРВЫМИ и только потом идёт по вариантам — значит на
        // «wb-404» он падает уже после того, как имя карточки стало черновым.
        // Без возврата к опубликованному владелец увидел бы ЧЕРНОВОЕ ИМЯ у
        // карточки, помеченной «черновик не читается»: худшая из подсказок —
        // половина правки, выданная за целое.
        ProductModel model = models.findById(modelId).orElseThrow();
        model.setDraft("{\"nameRu\":\"ЧЕРНОВОЕ ИМЯ\",\"variants\":{\"wb-404\":{\"price\":19000}}}");
        models.saveAndFlush(model);

        mockMvc.perform(get("/api/admin/storefront/preview")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.products[0].ru").value("Пальто"))
                .andExpect(jsonPath("$.brokenDrafts[0].kind").value("model"));

        // И в базе имя тоже не поехало: предпросмотр работает на отсоединённых строках.
        assertThat(models.findById(modelId).orElseThrow().getNameRu()).isEqualTo("Пальто");
    }

    @Test
    void aBrokenSectionDraftLeavesTheOtherRowsEditsVisible() throws Exception {
        StorefrontSection section = sections.findById(sectionId).orElseThrow();
        section.setDraft("{\"headlinRu\":\"опечатка в ключе\"}");
        sections.saveAndFlush(section);

        mockMvc.perform(put("/api/admin/storefront/models/" + modelId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nameRu\":\"Исправная правка\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/storefront/preview")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.products[0].ru").value("Исправная правка"))
                .andExpect(jsonPath("$.sections[0].headlineRu").value("Точный крой"))
                .andExpect(jsonPath("$.brokenDrafts", org.hamcrest.Matchers.hasSize(1)))
                .andExpect(jsonPath("$.brokenDrafts[0].kind").value("section"))
                .andExpect(jsonPath("$.brokenDrafts[0].key").value("aw26-hero"));
    }

    @Test
    void aBrokenSetDraftKeepsItsPublishedComposition() throws Exception {
        ProductSet set = sets.findById(setId).orElseThrow();
        set.setDraft("{\"items\":[{\"productId\":\"wb-1\",\"position\":0},{\"productId\":\"wb-1\",\"position\":1}]}");
        sets.saveAndFlush(set);

        mockMvc.perform(get("/api/admin/storefront/preview")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sets[0].items", org.hamcrest.Matchers.hasSize(1)))
                .andExpect(jsonPath("$.sets[0].items[0].productId").value("wb-1"))
                .andExpect(jsonPath("$.brokenDrafts[0].kind").value("set"))
                .andExpect(jsonPath("$.brokenDrafts[0].key").value("coat-lace"));
    }

    @Test
    void thePublicStorefrontNeverCarriesTheBrokenDraftMarker() throws Exception {
        ProductModel model = models.findById(modelId).orElseThrow();
        model.setDraft("{\"variants\":{\"wb-404\":{\"price\":19000}}}");
        models.saveAndFlush(model);

        clearStorefrontCache();
        mockMvc.perform(get("/api/catalog/storefront"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.products[0].ru").value("Пальто"))
                .andExpect(jsonPath("$.brokenDrafts").doesNotExist());
    }

    @Test
    void publishingABrokenDraftIsStillRefused() throws Exception {
        // Показать сломанное можно, опубликовать — нет: в предпросмотре строка
        // осталась опубликованной именно потому, что черновик не прочитан.
        ProductModel model = models.findById(modelId).orElseThrow();
        model.setDraft("{\"variants\":{\"wb-404\":{\"price\":19000}}}");
        models.saveAndFlush(model);

        mockMvc.perform(post("/api/admin/storefront/models/" + modelId + "/publish")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());
    }

    // ============================================================ чтение карточки для панели

    // Наличие (stock_quantity) в публичном ответе витрины нет и не должно быть:
    // покупателю остаток не показываем. Панели редактора он нужен, чтобы поле
    // открывалось с текущим значением, а не пустым.

    @Test
    void theEditorReadsAModelWithItsDraftAlreadyMerged() throws Exception {
        mockMvc.perform(put("/api/admin/storefront/products/wb-1")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"price\":19000,\"stockQuantity\":4}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/storefront/models/" + modelId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")))
                .andExpect(jsonPath("$.nameRu").value("Пальто"))
                .andExpect(jsonPath("$.variants['wb-1'].price").value(19000))
                .andExpect(jsonPath("$.variants['wb-1'].stockQuantity").value(4))
                .andExpect(jsonPath("$.variants['wb-2'].price").value(23000));
    }

    @Test
    void readingAModelWithABrokenDraftGivesThePublishedCard_notAnError() throws Exception {
        // Иначе карточку со сломанным черновиком нельзя было бы даже открыть,
        // чтобы починить: панель получила бы 400 вместо полей.
        ProductModel model = models.findById(modelId).orElseThrow();
        model.setDraft("{\"variants\":{\"wb-404\":{\"price\":19000}}}");
        models.saveAndFlush(model);

        mockMvc.perform(get("/api/admin/storefront/models/" + modelId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.variants['wb-1'].price").value(25000));
    }

    @Test
    void readingAModelIsAdminOnly() throws Exception {
        mockMvc.perform(get("/api/admin/storefront/models/" + modelId))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/storefront/models/" + modelId)
                        .header("Authorization", "Bearer " + shopperToken))
                .andExpect(status().isForbidden());
    }

    // ---------------------------------------------------------------- мерки
    // Мерки ИЗДЕЛИЯ по размерам модели (п. 15). Модель в setUp — размеры S, M.

    private org.springframework.test.web.servlet.ResultActions draftMeasurements(String json) throws Exception {
        return mockMvc.perform(put("/api/admin/storefront/models/" + modelId)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"measurements\":" + json + "}"));
    }

    private void publishModelNow() throws Exception {
        mockMvc.perform(post("/api/admin/storefront/models/" + modelId + "/publish")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    @Test
    void measurementsAreDraftedInvisiblyAndPublishedToTheStorefront() throws Exception {
        draftMeasurements("[{\"kind\":\"chest\",\"values\":{\"S\":46,\"M\":48.5}}]")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.measurements[0].values.M").value(48.5));

        clearStorefrontCache();
        mockMvc.perform(get("/api/catalog/storefront"))
                .andExpect(jsonPath("$.products[0].measurements").doesNotExist());

        publishModelNow();
        mockMvc.perform(get("/api/catalog/storefront"))
                .andExpect(jsonPath("$.products[0].measurements[0].kind").value("chest"))
                .andExpect(jsonPath("$.products[0].measurements[0].values.S").value(46));
    }

    // Массив заменяется целиком: снятая мерка не остаётся в черновике с
    // прошлого раза, как осталась бы при объекте «мерка → …».
    @Test
    void aRemovedMeasurementIsReallyGoneAndAnEmptyListRemovesTheTable() throws Exception {
        draftMeasurements("[{\"kind\":\"chest\",\"values\":{\"S\":46}},{\"kind\":\"length\",\"values\":{\"S\":110}}]")
                .andExpect(status().isOk());
        publishModelNow();

        draftMeasurements("[{\"kind\":\"length\",\"values\":{\"S\":111}}]")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.measurements.length()").value(1))
                .andExpect(jsonPath("$.measurements[0].kind").value("length"));
        publishModelNow();
        mockMvc.perform(get("/api/catalog/storefront"))
                .andExpect(jsonPath("$.products[0].measurements.length()").value(1))
                .andExpect(jsonPath("$.products[0].measurements[0].values.S").value(111));

        draftMeasurements("[]").andExpect(status().isOk());
        publishModelNow();
        mockMvc.perform(get("/api/catalog/storefront"))
                .andExpect(jsonPath("$.products[0].measurements").doesNotExist());
        assertThat(models.findById(modelId).orElseThrow().getMeasurements()).isNull();
    }

    @Test
    void measurementsThatDoNotFitTheModelAreRefused() throws Exception {
        // неизвестная мерка
        draftMeasurements("[{\"kind\":\"collar\",\"values\":{\"S\":40}}]").andExpect(status().isBadRequest());
        // размера нет в наборе модели
        draftMeasurements("[{\"kind\":\"chest\",\"values\":{\"XL\":52}}]").andExpect(status().isBadRequest());
        // за пределами 1–300 см
        draftMeasurements("[{\"kind\":\"chest\",\"values\":{\"S\":0}}]").andExpect(status().isBadRequest());
        draftMeasurements("[{\"kind\":\"length\",\"values\":{\"S\":301}}]").andExpect(status().isBadRequest());
        // шаг не 0,5
        draftMeasurements("[{\"kind\":\"chest\",\"values\":{\"S\":46.3}}]").andExpect(status().isBadRequest());
        // одна мерка дважды
        draftMeasurements("[{\"kind\":\"chest\",\"values\":{\"S\":46}},{\"kind\":\"chest\",\"values\":{\"M\":48}}]")
                .andExpect(status().isBadRequest());
        // строка без значений
        draftMeasurements("[{\"kind\":\"chest\",\"values\":{}}]").andExpect(status().isBadRequest());
    }

    // Снял размер из набора, а мерка по нему осталась — публикация не пройдёт:
    // на карточке была бы колонка размера, которого у вещи нет.
    @Test
    void droppingASizeThatStillHasAMeasurementIsRefused() throws Exception {
        draftMeasurements("[{\"kind\":\"chest\",\"values\":{\"S\":46,\"M\":48}}]").andExpect(status().isOk());
        mockMvc.perform(put("/api/admin/storefront/models/" + modelId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sizes\":[\"S\"]}"))
                .andExpect(status().isBadRequest());
    }
}
