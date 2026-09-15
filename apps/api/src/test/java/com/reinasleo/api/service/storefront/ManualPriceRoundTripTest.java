package com.reinasleo.api.service.storefront;

import com.reinasleo.api.model.MarketplacePrice;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.ProductModel;
import com.reinasleo.api.repository.MarketplacePriceRepository;
import com.reinasleo.api.repository.ProductModelRepository;
import com.reinasleo.api.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Круговой обход цены при включённом источнике.
 *
 * ПОЧЕМУ ЭТОТ ТЕСТ ВООБЩЕ ПОЯВИЛСЯ. Координатор просил развести на экране «вашу
 * цену» и «цену с площадки»: поле «Цена» при включённом источнике показывает
 * базу с площадки под именем, которое читается как собственная цена владельца.
 * Он назвал это третьим случаем «одно имя для двух смыслов».
 *
 * При разборе выяснилось, что дело не только в подписи. ЧИТАЕТСЯ цена площадки
 * (publishedVariant отдаёт VariantPrice.basePrice), а ЗАПИСЫВАЕТСЯ она в
 * колонку РУЧНОЙ цены (applyVariant пишет r.price() в products.price). Черновик
 * сливается поверх опубликованного, то есть нетронутые поля приезжают обратно
 * теми же, какими их отдали.
 *
 * Значит правка ЛЮБОГО другого поля варианта — хоть имени цвета — переписывала
 * бы собственную цену владельца ценой площадки. Молча.
 *
 * Тест утверждает обратное: ручная цена переживает публикацию нетронутой.
 */
@SpringBootTest
@ActiveProfiles("test")
class ManualPriceRoundTripTest {

    @Autowired private StorefrontAdminService admin;
    @Autowired private ProductModelRepository models;
    @Autowired private ProductRepository products;
    @Autowired private MarketplacePriceRepository prices;

    private UUID modelId;

    @BeforeEach
    void setUp() {
        prices.deleteAll();
        products.deleteAll();
        models.deleteAll();

        ProductModel model = new ProductModel();
        model.setModelKey(9201);
        model.setSlug("round-trip-" + UUID.randomUUID());
        model.setNameRu("Пальто «Ноэль»");
        model.setNameEn("Noel coat");
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

        Product v = new Product();
        v.setId("rt-1");
        v.setModelId(modelId);
        v.setTitle("Пальто «Ноэль»");
        v.setColorKey("k0");
        v.setColorHex("#333333");
        v.setColorNameRu("графит");
        v.setPrice(new BigDecimal("7500"));   // СОБСТВЕННАЯ цена владельца
        v.setPriceSource("ozon");             // но показывается цена площадки
        v.setDiscountPct(0);
        v.setSortOrder(0);
        v.setActive(true);
        products.save(v);

        prices.save(row("rt-1", "ozon", 500000L, null));   // площадка: 5000 ₽
        prices.save(row("rt-1", null, null, 180000L));      // себестоимость 1800 ₽
    }

    private static MarketplacePrice row(String productId, String source, Long buyerKop, Long costKop) {
        MarketplacePrice r = new MarketplacePrice();
        r.setProductId(productId);
        r.setSource(source);
        r.setBuyerPriceKop(buyerKop);
        r.setCostPriceKop(costKop);
        r.setCheckedAt(Instant.now());
        r.setReceivedAt(Instant.now());
        return r;
    }

    @Test
    void правкаИмениЦвета_неЗатираетСобственнуюЦенуЦенойПлощадки() {
        // Владелец меняет только имя цвета. Цену он не трогал вовсе.
        admin.saveVariantDraft("rt-1", "{\"colorNameRu\":\"уголь\"}");
        admin.publishModel(modelId);

        Product after = products.findById("rt-1").orElseThrow();

        assertThat(after.getColorNameRu()).isEqualTo("уголь");
        // Вот утверждение, ради которого тест написан: собственная цена цела.
        // До починки здесь оказывалось 5000 — цена площадки, приехавшая обратно
        // через поле с чужим смыслом.
        assertThat(after.getPrice()).isEqualByComparingTo("7500");
    }
}
