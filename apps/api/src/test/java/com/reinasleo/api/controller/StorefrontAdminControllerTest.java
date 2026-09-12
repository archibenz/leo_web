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
}
