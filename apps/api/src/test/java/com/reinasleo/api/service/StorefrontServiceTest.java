package com.reinasleo.api.service;

import com.reinasleo.api.dto.storefront.StorefrontProduct;
import com.reinasleo.api.dto.storefront.StorefrontResponse;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.ProductModel;
import com.reinasleo.api.model.ProductSet;
import com.reinasleo.api.model.ProductSetItem;
import com.reinasleo.api.repository.ProductModelRepository;
import com.reinasleo.api.repository.ProductRepository;
import com.reinasleo.api.repository.ProductSetItemRepository;
import com.reinasleo.api.repository.ProductSetRepository;
import com.reinasleo.api.repository.StorefrontSectionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StorefrontServiceTest {

    @Mock private ProductModelRepository models;
    @Mock private ProductRepository products;
    @Mock private ProductSetRepository sets;
    @Mock private ProductSetItemRepository setItems;
    @Mock private StorefrontSectionRepository sections;

    private StorefrontService service;

    @BeforeEach
    void setUp() {
        service = new StorefrontService(models, products, sets, setItems, sections);
    }

    private static ProductModel model(UUID id, int key, String slug) {
        ProductModel m = new ProductModel();
        ReflectionTestUtils.setField(m, "id", id);
        m.setModelKey(key); m.setSlug(slug); m.setNameRu("Пальто"); m.setNameEn("Coat");
        m.setCategory("outerwear"); m.setDescRu("о"); m.setDescEn("d");
        m.setCompositionRu("ш"); m.setCompositionEn("w"); m.setCareRu("у"); m.setCareEn("c");
        m.setSizes(new String[]{"S", "M"}); m.setImage("/i/m.jpg"); m.setGallery("[\"/i/g1.jpg\"]");
        m.setFeaturedOrder(2);
        return m;
    }

    private static Product variant(UUID modelId, String id, String colour, long nm, String price, String sale, int order) {
        Product p = new Product();
        p.setId(id); p.setModelId(modelId); p.setColorKey(colour); p.setColorHex("#000000");
        p.setColorNameRu("Чёрный"); p.setColorNameEn("Black"); p.setNm(nm);
        p.setPrice(price == null ? null : new BigDecimal(price));
        p.setSalePrice(sale == null ? null : new BigDecimal(sale));
        p.setImage("/i/" + colour + ".jpg"); p.setImages("[{\"src\":\"/i/" + colour + "-2.jpg\",\"alt\":\"\"}]");
        p.setSortOrder(order); p.setTitle("t"); p.setActive(true);
        return p;
    }

    @Test
    void getStorefront_mapsModelWithVariantsIntoWhiteProductShape() {
        UUID mid = UUID.randomUUID();
        when(models.findByActiveTrueOrderBySortOrderAsc()).thenReturn(List.of(model(mid, 2, "palto")));
        when(products.findByModelIdIsNotNullAndActiveTrueOrderByModelIdAscSortOrderAsc()).thenReturn(List.of(
                variant(mid, "wb-2", "black", 2L, "23000", null, 1),
                variant(mid, "wb-1", "camel", 1L, "25000", "12000", 0)));
        when(sets.findByActiveTrueOrderBySortOrderAsc()).thenReturn(List.of());
        when(setItems.findAllByOrderBySetIdAscPositionAsc()).thenReturn(List.of());
        when(sections.findByStatusOrderBySortOrderAsc("active")).thenReturn(List.of());

        StorefrontResponse r = service.getStorefront();

        assertThat(r.products()).hasSize(1);
        StorefrontProduct p = r.products().get(0);
        assertThat(p.key()).isEqualTo(2);
        assertThat(p.slug()).isEqualTo("palto");
        assertThat(p.colors()).extracting(c -> c.key()).containsExactly("camel", "black");
        assertThat(p.price()).isEqualByComparingTo("25000");
        assertThat(p.sale()).isEqualByComparingTo("12000");
        assertThat(p.nm()).isEqualTo(1L);
        assertThat(p.colors().get(0).id()).isEqualTo("wb-1");
        assertThat(p.colors().get(0).gallery()).containsExactly("/i/camel-2.jpg");
        assertThat(p.sizes()).containsExactly("S", "M");
        assertThat(p.gallery()).containsExactly("/i/g1.jpg");
        assertThat(p.featuredOrder()).isEqualTo(2);
    }

    @Test
    void getStorefront_modelWhoseVariantsHaveNoPrice_hasNoPrice() {
        UUID mid = UUID.randomUUID();
        when(models.findByActiveTrueOrderBySortOrderAsc()).thenReturn(List.of(model(mid, 21, "kostyum")));
        when(products.findByModelIdIsNotNullAndActiveTrueOrderByModelIdAscSortOrderAsc()).thenReturn(List.of(
                variant(mid, "wb-9", "black", 9L, null, null, 0)));
        when(sets.findByActiveTrueOrderBySortOrderAsc()).thenReturn(List.of());
        when(setItems.findAllByOrderBySetIdAscPositionAsc()).thenReturn(List.of());
        when(sections.findByStatusOrderBySortOrderAsc("active")).thenReturn(List.of());

        StorefrontProduct p = service.getStorefront().products().get(0);
        assertThat(p.price()).isNull();
        assertThat(p.colors().get(0).price()).isNull();
    }

    @Test
    void getStorefront_modelWithItsOwnArticle_keepsItInsteadOfTheFirstVariants() {
        // Ключ 7 («Брюки алладины»): карточка WB модели заведена на белый цвет,
        // а первым на витрине стоит песочный. Артикул модели решает, какой снимок
        // стока ей соответствует и какой sku уедет в JSON-LD.
        UUID mid = UUID.randomUUID();
        ProductModel m = model(mid, 7, "bryuki-alladiny");
        m.setNm(962783109L);
        when(models.findByActiveTrueOrderBySortOrderAsc()).thenReturn(List.of(m));
        when(products.findByModelIdIsNotNullAndActiveTrueOrderByModelIdAscSortOrderAsc()).thenReturn(List.of(
                variant(mid, "wb-962783114", "sand", 962783114L, "6000", null, 0),
                variant(mid, "wb-962783109", "white", 962783109L, "6000", null, 1)));
        when(sets.findByActiveTrueOrderBySortOrderAsc()).thenReturn(List.of());
        when(setItems.findAllByOrderBySetIdAscPositionAsc()).thenReturn(List.of());
        when(sections.findByStatusOrderBySortOrderAsc("active")).thenReturn(List.of());

        StorefrontProduct p = service.getStorefront().products().get(0);

        assertThat(p.nm()).isEqualTo(962783109L);
        // Цена и первый цвет по-прежнему с первого варианта — артикул отдельно.
        assertThat(p.colors().get(0).nm()).isEqualTo(962783114L);
    }

    @Test
    void getStorefront_modelWithoutItsOwnArticle_fallsBackToTheFirstVariant() {
        UUID mid = UUID.randomUUID();
        when(models.findByActiveTrueOrderBySortOrderAsc()).thenReturn(List.of(model(mid, 2, "palto")));
        when(products.findByModelIdIsNotNullAndActiveTrueOrderByModelIdAscSortOrderAsc()).thenReturn(List.of(
                variant(mid, "wb-1", "camel", 1L, "25000", null, 0)));
        when(sets.findByActiveTrueOrderBySortOrderAsc()).thenReturn(List.of());
        when(setItems.findAllByOrderBySetIdAscPositionAsc()).thenReturn(List.of());
        when(sections.findByStatusOrderBySortOrderAsc("active")).thenReturn(List.of());

        assertThat(service.getStorefront().products().get(0).nm()).isEqualTo(1L);
    }

    @Test
    void getStorefront_setItemsResolveToProductKeyAndColour() {
        UUID mid = UUID.randomUUID();
        UUID sid = UUID.randomUUID();
        when(models.findByActiveTrueOrderBySortOrderAsc()).thenReturn(List.of(model(mid, 2, "palto")));
        when(products.findByModelIdIsNotNullAndActiveTrueOrderByModelIdAscSortOrderAsc()).thenReturn(List.of(
                variant(mid, "wb-1", "camel", 1L, "25000", null, 0)));
        ProductSet s = new ProductSet();
        ReflectionTestUtils.setField(s, "id", sid);
        s.setKey("coat-lace"); s.setNameRu("Пальто и кружево"); s.setNameEn("Coat and Lace");
        s.setDescRu("о"); s.setDescEn("d"); s.setImage("/i/s.jpg");
        when(sets.findByActiveTrueOrderBySortOrderAsc()).thenReturn(List.of(s));
        ProductSetItem it = new ProductSetItem();
        it.setSetId(sid); it.setProductId("wb-1"); it.setPosition(0);
        when(setItems.findAllByOrderBySetIdAscPositionAsc()).thenReturn(List.of(it));
        when(sections.findByStatusOrderBySortOrderAsc("active")).thenReturn(List.of());

        StorefrontResponse r = service.getStorefront();
        assertThat(r.sets()).hasSize(1);
        assertThat(r.sets().get(0).items()).hasSize(1);
        assertThat(r.sets().get(0).items().get(0).productKey()).isEqualTo(2);
        assertThat(r.sets().get(0).items().get(0).colourKey()).isEqualTo("camel");
    }
}
