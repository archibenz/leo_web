package com.reinasleo.api.service.storefront;

import com.reinasleo.api.exception.BelowCostException;
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
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Запрет продавать ниже себестоимости — второй ручной путь, редактор на
 * странице. Слово владельца: «ни руками, ни автоматом».
 *
 * ЗАПРЕТ СТОИТ НА ПУБЛИКАЦИИ, А НЕ НА СОХРАНЕНИИ ЧЕРНОВИКА, и первый кейс это
 * утверждает прямо. Черновик цену не пишет — он копится в model.draft и
 * покупателю не виден. Отказывать раньше значило бы мешать владельцу набирать
 * карточку: один патч несёт и тексты, и кадры, и отказ по цене унёс бы с собой
 * всё остальное.
 *
 * Логику самого запрета проверяет BelowCostGuardTest. Здесь проверяется, что
 * он ЗОВЁТСЯ отсюда: сторож, стоящий не на посту, тестами своей логики
 * выглядит исправным.
 */
@SpringBootTest
@ActiveProfiles("test")
class PublishBelowCostTest {

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
        model.setModelKey(9101);
        model.setSlug("below-cost-" + UUID.randomUUID());
        model.setNameRu("Платье «Лея»");
        model.setNameEn("Leya dress");
        model.setCategory("dresses");
        model.setDescRu("описание");
        model.setDescEn("description");
        model.setCompositionRu("шёлк");
        model.setCompositionEn("silk");
        model.setCareRu("уход");
        model.setCareEn("care");
        model.setSizes(new String[]{"S"});
        model.setImage("/images/white/dress.jpg");
        modelId = models.save(model).getId();

        products.save(variant("bc-sand", 0, "песок"));
        products.save(variant("bc-coal", 1, "уголь"));

        // Себестоимость 2500 ₽ у обоих. Строка с source=NULL — та самая, что
        // по контракту V35 несёт себестоимость нашего учёта.
        prices.save(cost("bc-sand", 250000L));
        prices.save(cost("bc-coal", 250000L));
    }

    private Product variant(String id, int order, String colorNameRu) {
        Product p = new Product();
        p.setId(id);
        p.setModelId(modelId);
        p.setTitle("Платье «Лея»");
        p.setColorKey("k" + order);
        p.setColorHex("#b89a6e");
        p.setColorNameRu(colorNameRu);
        p.setPrice(new BigDecimal("7500"));
        p.setSortOrder(order);
        p.setActive(true);
        return p;
    }

    private static MarketplacePrice cost(String productId, long costKop) {
        MarketplacePrice row = new MarketplacePrice();
        row.setProductId(productId);
        row.setSource(null);
        row.setCostPriceKop(costKop);
        row.setCheckedAt(Instant.now());
        row.setReceivedAt(Instant.now());
        return row;
    }

    @Test
    void черновикСценойНижеСебестоимости_сохраняется_аПубликацияОтказывает() {
        // Черновик проходит: владелец ещё набирает карточку.
        assertThatCode(() -> admin.saveVariantDraft("bc-sand", "{\"price\":2000.00}"))
                .doesNotThrowAnyException();

        // Публикация — нет: вот здесь вещь становится продаваемой.
        assertThatThrownBy(() -> admin.publishModel(modelId))
                .isInstanceOf(BelowCostException.class);

        // И цена в базе осталась прежней: отказ пришёл ДО записи.
        assertThat(products.findById("bc-sand").orElseThrow().getPrice())
                .isEqualByComparingTo("7500");
    }

    @Test
    void дваВариантаНижеСебестоимости_вОтказеОба_аНеПервый() {
        admin.saveVariantDraft("bc-sand", "{\"price\":2000.00}");
        admin.saveVariantDraft("bc-coal", "{\"price\":1000.00}");

        assertThatThrownBy(() -> admin.publishModel(modelId))
                .isInstanceOf(BelowCostException.class)
                .satisfies(e -> {
                    var violations = ((BelowCostException) e).getViolations();
                    // Владелец правит карточку со всеми цветами разом. Отказ по
                    // одному заставил бы его чинить их по очереди, узнавая о
                    // следующем только после новой попытки.
                    assertThat(violations).hasSize(2);
                    assertThat(violations).extracting(BelowCostException.Violation::field)
                            .containsExactlyInAnyOrder("variants[bc-sand].price", "variants[bc-coal].price");
                    // Имя цвета в тексте: у модели все варианты называются
                    // одинаково, и без него непонятно, какой поправить.
                    assertThat(violations).extracting(BelowCostException.Violation::message)
                            .anySatisfy(m -> assertThat(m).contains("песок"))
                            .anySatisfy(m -> assertThat(m).contains("уголь"));
                });
    }

    @Test
    void ценаВышеСебестоимости_публикуется() {
        admin.saveVariantDraft("bc-sand", "{\"price\":9000.00}");

        assertThatCode(() -> admin.publishModel(modelId)).doesNotThrowAnyException();
        assertThat(products.findById("bc-sand").orElseThrow().getPrice())
                .isEqualByComparingTo("9000.00");
    }

    @Test
    void себестоимостьНеизвестна_публикацияПроходит() {
        prices.deleteAll();
        admin.saveVariantDraft("bc-sand", "{\"price\":1.00}");

        // Решение: где числа не знаем — не запрещаем. Иначе товар без учётной
        // себестоимости стал бы неопубликуемым.
        assertThatCode(() -> admin.publishModel(modelId)).doesNotThrowAnyException();
    }
}
