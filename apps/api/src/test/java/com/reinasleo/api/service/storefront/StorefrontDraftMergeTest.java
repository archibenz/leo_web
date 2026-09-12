package com.reinasleo.api.service.storefront;

import com.reinasleo.api.dto.admin.storefront.StorefrontModelRequest;
import com.reinasleo.api.dto.admin.storefront.StorefrontSectionRequest;
import com.reinasleo.api.dto.admin.storefront.StorefrontSetItemRequest;
import com.reinasleo.api.dto.admin.storefront.StorefrontSetRequest;
import com.reinasleo.api.dto.admin.storefront.StorefrontVariantRequest;
import com.reinasleo.api.exception.BadRequestException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StorefrontDraftMergeTest {

    private static StorefrontSectionRequest section() {
        return new StorefrontSectionRequest("Осень", "Autumn", "О/З", "A/W", "Точный крой", "Precise cut",
                null, null, "/videos/white/hero.mp4", "/videos/white/hero-desktop.mp4",
                "/images/white/hero.jpg", null, 0);
    }

    private static StorefrontVariantRequest variant(String price, String sale) {
        return new StorefrontVariantRequest(price == null ? null : new BigDecimal(price),
                sale == null ? null : new BigDecimal(sale),
                "camel", "#b89a6e", "Кэмел", "Camel", "/images/white/camel.jpg", List.of("/images/white/camel-2.jpg"),
                4, true, 0);
    }

    private static StorefrontModelRequest model() {
        return new StorefrontModelRequest("Пальто", "Coat", "outerwear", "о", "d", null, null,
                "шерсть", "wool", "уход", "care", List.of("S", "M"), "/images/white/coat.jpg",
                List.of("/images/white/coat-2.jpg"), "aw26", 2, null, 0, true,
                Map.of("wb-1", variant("25000", null), "wb-2", variant("23000", null)));
    }

    @Test
    void merge_withoutDraft_returnsPublishedUntouched() {
        StorefrontSectionRequest published = section();

        assertThat(StorefrontDraftMerge.merge(published, null, StorefrontSectionRequest.class)).isEqualTo(published);
        assertThat(StorefrontDraftMerge.merge(published, "  ", StorefrontSectionRequest.class)).isEqualTo(published);
        assertThat(StorefrontDraftMerge.merge(published, "{}", StorefrontSectionRequest.class)).isEqualTo(published);
    }

    @Test
    void merge_overlaysOnlyTheKeysTheDraftMentions() {
        StorefrontSectionRequest merged = StorefrontDraftMerge.merge(
                section(), "{\"headlineRu\":\"Новый заголовок\"}", StorefrontSectionRequest.class);

        assertThat(merged.headlineRu()).isEqualTo("Новый заголовок");
        assertThat(merged.headlineEn()).isEqualTo("Precise cut");
        assertThat(merged.nameRu()).isEqualTo("Осень");
        assertThat(merged.videoUrl()).isEqualTo("/videos/white/hero.mp4");
    }

    @Test
    void merge_explicitNullInDraftClearsTheField() {
        // Снять постер — это намерение, а не «ключ забыли». Явный null обязан
        // отличаться от отсутствующего ключа, иначе очистить поле нечем.
        StorefrontSectionRequest merged = StorefrontDraftMerge.merge(
                section(), "{\"posterUrl\":null}", StorefrontSectionRequest.class);

        assertThat(merged.posterUrl()).isNull();
        assertThat(merged.videoUrl()).isEqualTo("/videos/white/hero.mp4");
    }

    @Test
    void merge_arraysAreReplacedWholesale_notAppended() {
        StorefrontModelRequest merged = StorefrontDraftMerge.merge(
                model(), "{\"gallery\":[\"/images/white/new.jpg\"]}", StorefrontModelRequest.class);

        assertThat(merged.gallery()).containsExactly("/images/white/new.jpg");
    }

    @Test
    void merge_variantDraftLivesInsideTheModelAndTouchesOneVariantOnly() {
        // Условие 1: черновик варианта живёт внутри черновика модели, ключ — products.id.
        StorefrontModelRequest merged = StorefrontDraftMerge.merge(
                model(), "{\"variants\":{\"wb-1\":{\"price\":19000}}}", StorefrontModelRequest.class);

        assertThat(merged.variants().get("wb-1").price()).isEqualByComparingTo("19000");
        assertThat(merged.variants().get("wb-1").colorNameRu()).isEqualTo("Кэмел");
        assertThat(merged.variants().get("wb-1").gallery()).containsExactly("/images/white/camel-2.jpg");
        assertThat(merged.variants().get("wb-2").price()).isEqualByComparingTo("23000");
    }

    @Test
    void merge_setCompositionIsAnArrayInsideTheSetDraft() {
        StorefrontSetRequest published = new StorefrontSetRequest("Пальто и кружево", "Coat and Lace", "о", "d",
                "/images/white/set.jpg", 0, true,
                List.of(new StorefrontSetItemRequest("wb-1", 0), new StorefrontSetItemRequest("wb-2", 1)));

        StorefrontSetRequest merged = StorefrontDraftMerge.merge(published,
                "{\"items\":[{\"productId\":\"wb-9\",\"position\":0}]}", StorefrontSetRequest.class);

        assertThat(merged.items()).extracting(StorefrontSetItemRequest::productId).containsExactly("wb-9");
        assertThat(merged.nameRu()).isEqualTo("Пальто и кружево");
    }

    @Test
    void merge_unknownKeyIsRejected_becauseJsonbValidatesNothing() {
        // Опечатка в ключе иначе тихо доедет до витрины: JSONB примет что угодно.
        assertThatThrownBy(() -> StorefrontDraftMerge.merge(
                section(), "{\"headlinRu\":\"опечатка\"}", StorefrontSectionRequest.class))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("headlinRu");
    }

    @Test
    void merge_unknownKeyInsideANestedVariantIsRejectedToo() {
        assertThatThrownBy(() -> StorefrontDraftMerge.merge(
                model(), "{\"variants\":{\"wb-1\":{\"prise\":19000}}}", StorefrontModelRequest.class))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("prise");
    }

    @Test
    void merge_malformedDraftIsRejected() {
        assertThatThrownBy(() -> StorefrontDraftMerge.merge(section(), "not json", StorefrontSectionRequest.class))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void merge_draftThatIsNotAnObjectIsRejected() {
        assertThatThrownBy(() -> StorefrontDraftMerge.merge(section(), "[1,2,3]", StorefrontSectionRequest.class))
                .isInstanceOf(BadRequestException.class);
    }
}
