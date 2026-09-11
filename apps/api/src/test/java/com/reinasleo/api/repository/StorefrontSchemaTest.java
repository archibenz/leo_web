package com.reinasleo.api.repository;

import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.ProductModel;
import com.reinasleo.api.model.ProductSet;
import com.reinasleo.api.model.ProductSetItem;
import com.reinasleo.api.model.StorefrontSection;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
@ActiveProfiles("test")
class StorefrontSchemaTest {

    @Autowired private ProductModelRepository models;
    @Autowired private ProductRepository products;
    @Autowired private ProductSetRepository sets;
    @Autowired private ProductSetItemRepository setItems;
    @Autowired private StorefrontSectionRepository sections;

    @Test
    void modelWithTwoVariantsAndASet_roundTrips() {
        ProductModel m = new ProductModel();
        m.setModelKey(1);
        m.setSlug("lnyanoy-kostyum");
        m.setNameRu("Льняной костюм");
        m.setNameEn("Linen Suit");
        m.setCategory("tailoring");
        m.setDescRu("к"); m.setDescEn("d");
        m.setCompositionRu("лён"); m.setCompositionEn("linen");
        m.setCareRu("стирка"); m.setCareEn("wash");
        m.setSizes(new String[]{"XS", "S", "M", "L", "XL"});
        m.setImage("/images/white/products/a.jpg");
        m = models.save(m);

        Product ivory = variant("wb-1008989269", m, "ivory", 1008989269L, new BigDecimal("8000"), 0);
        Product black = variant("wb-1008989270", m, "black", 1008989270L, null, 1);
        products.save(ivory);
        products.save(black);

        ProductSet s = new ProductSet();
        s.setKey("summer"); s.setNameRu("Лето"); s.setNameEn("Summer");
        s.setDescRu("о"); s.setDescEn("d"); s.setImage("/images/white/sets/summer-v5.jpg");
        s = sets.save(s);
        ProductSetItem item = new ProductSetItem();
        item.setSetId(s.getId()); item.setProductId(ivory.getId()); item.setPosition(0);
        setItems.save(item);

        StorefrontSection hero = new StorefrontSection();
        hero.setSlug("aw26-hero"); hero.setLayout("hero"); hero.setStatus("active");
        hero.setNameRu("Осень / Зима 2026"); hero.setNameEn("Autumn / Winter 2026");
        hero.setVideoUrl("/videos/white/hero-mark2.mp4");
        sections.save(hero);

        List<Product> variants = products.findByModelIdIsNotNullAndActiveTrueOrderBySortOrderAsc();
        assertThat(variants).extracting(Product::getId).containsExactly("wb-1008989269", "wb-1008989270");
        assertThat(variants.get(1).getPrice()).isNull();                 // предзаказ допустим
        assertThat(models.findByActiveTrueOrderBySortOrderAsc()).hasSize(1);
        assertThat(setItems.findAllByOrderBySetIdAscPositionAsc()).hasSize(1);
        assertThat(sections.findByStatusOrderBySortOrderAsc("active")).extracting(StorefrontSection::getSlug).containsExactly("aw26-hero");
        assertThat(sections.findByStatusOrderBySortOrderAsc("archived")).isEmpty();
    }

    private static Product variant(String id, ProductModel m, String colour, long nm, BigDecimal price, int order) {
        Product p = new Product();
        p.setId(id);
        p.setTitle(m.getNameRu() + " — " + colour);
        p.setPrice(price);
        p.setImage(m.getImage());
        p.setCategory(m.getCategory());
        p.setSizes(m.getSizes());
        p.setModelId(m.getId());
        p.setColorKey(colour);
        p.setColorHex("#ece6da");
        p.setColorNameRu(colour); p.setColorNameEn(colour);
        p.setNm(nm);
        p.setColor(colour);
        p.setSku("WB-" + nm);
        p.setSortOrder(order);
        p.setImages("[]");
        return p;
    }
}
