package com.reinasleo.api.dto.admin.storefront;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Цветовой вариант модели. Цена необязательна — товар без цены это предзаказ
 * (V29, CheckoutService такой товар отклоняет). Артикула `nm` здесь нет
 * намеренно: он опознаёт карточку WB, а не оформление, и уникален в базе.
 *
 * ДВА СМЫСЛА У СЛОВА «ЦЕНА» РАЗВЕДЕНЫ ПО ДВУМ ПОЛЯМ, и это не украшение
 * экрана, а починка потери данных.
 *
 * С этапа 2 (V36) price отдавалось как результат VariantPriceCalculator —
 * то есть при price_source=ozon в нём приезжала цена ПЛОЩАДКИ. Записывалось
 * же оно в products.price, колонку СОБСТВЕННОЙ цены владельца. А черновик
 * сливается поверх опубликованного: поле, которого правка не касалась,
 * возвращается тем же, каким его отдали. Значит правка любого другого поля
 * варианта — хоть имени цвета — переписывала бы собственную цену владельца
 * ценой Ozon. Молча и без возврата. Сторожем на этом свойстве стоит
 * ManualPriceRoundTripTest.
 *
 * Поэтому здесь ровно одно правило, и оно простое:
 *   • ПИШУЩИЕ поля — зеркало колонок. price — products.price, и ничего
 *     больше: «ваша цена». salePrice — products.sale_price;
 *   • ЧИТАЮЩИЕ поля — вывод калькулятора, applyVariant их не трогает:
 *     sourcePrice, shownPrice, sourceCheckedAt и четыре признака ниже.
 *
 * Совместное присутствие тех и других в одном record, а не отдельный
 * ответ-only DTO — тот же приём, что описан в шапке StorefrontMapping:
 * разъехавшиеся форма записи и форма чтения дают «сохранил одно, увидел
 * другое». Цена показала, что и внутри одного DTO этого мало: смысл поля
 * обязан совпадать на чтении и на записи, иначе круг замыкается и затирает.
 */
public record StorefrontVariantRequest(
        /** «Ваша цена» — ровно products.price. Её владелец правит, её и пишем. */
        @DecimalMin("0.01") BigDecimal price,
        /**
         * products.sale_price. Колонку с этапа 2 никто не читает (цену со
         * скидкой считает VariantPriceCalculator), но зеркалим честно: поле,
         * которое отдаёт одно, а пишет другое, — это и есть разобранная выше
         * беда.
         */
        @DecimalMin("0.01") BigDecimal salePrice,
        @Size(max = 32) String colorKey,
        @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "colour hex must look like #b89a6e") String colorHex,
        @Size(max = 64) String colorNameRu,
        @Size(max = 64) String colorNameEn,
        @Size(max = 512) @Pattern(regexp = MediaUrl.PATTERN, message = MediaUrl.MESSAGE) String image,
        List<@Size(max = 512) @Pattern(regexp = MediaUrl.PATTERN, message = MediaUrl.MESSAGE) String> gallery,
        @Min(0) int stockQuantity,
        boolean active,
        int sortOrder,
        @NotBlank @Pattern(regexp = "^(manual|ozon)$", message = "unknown price source") String priceSource,
        @Min(0) @Max(90) int discountPct,
        boolean sourceMissing,
        boolean costUnknown,
        boolean thresholdApplied,
        boolean manualPriceInactive,
        /**
         * «Цена с площадки» — та, что пришла в marketplace_prices для текущего
         * priceSource. Только на чтение.
         *
         * Пусто, когда источник ручной ИЛИ когда площадка ничего не присылала
         * (тогда поднят sourceMissing). Нарочно не basePrice калькулятора: тот
         * при пропавшем источнике откатывается на ручную цену, и под подписью
         * «цена с Ozon» владелец увидел бы своё же число — третий за день
         * случай одного имени для двух смыслов.
         */
        BigDecimal sourcePrice,
        /**
         * Что заплатит покупатель: цена со скидкой, а если её нет — основа.
         * Только на чтение.
         *
         * Без неё экран честен лишь наполовину: при сработавшем пороге
         * (thresholdApplied) покупатель видит себестоимость, и вывести это
         * число из «вашей цены» и процента скидки на экране нельзя.
         */
        BigDecimal shownPrice,
        /**
         * Когда площадка присылала цену в последний раз. Только на чтение.
         *
         * Без даты застывший источник виден одному сторожу на стороне
         * координатора, а он будит координатора, не владельца. С датой
         * владелец сам отвечает себе на вопрос «почему цена не та».
         *
         * Пусто, когда источник ручной или строки с ценой нет вовсе.
         */
        Instant sourceCheckedAt
) {

    // @JsonIgnore обязателен: без него Jackson видит здесь свойство
    // saleBelowPrice, кладёт его в снимок опубликованного, и слияние падает
    // на нём как на неизвестном ключе.
    @JsonIgnore
    @AssertTrue(message = "sale price must be set together with price and stay below it")
    public boolean isSaleBelowPrice() {
        return salePrice == null || (price != null && salePrice.compareTo(price) < 0);
    }
}
