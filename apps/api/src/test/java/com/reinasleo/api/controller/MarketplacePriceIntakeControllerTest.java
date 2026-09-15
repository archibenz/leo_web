package com.reinasleo.api.controller;

import com.reinasleo.api.model.MarketplacePrice;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.repository.MarketplacePriceRepository;
import com.reinasleo.api.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Образец — StorefrontAdminControllerTest. Приёмка этого контракта (см.
// task-price-intake-brief.md) сформулирована "проверяется следствием": там,
// где брифом велено читать базу напрямую, а не верить коду ответа, тесты
// ниже делают именно это через marketplacePrices/products.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MarketplacePriceIntakeControllerTest {

    private static final String URL = "/api/integrations/marketplace-prices";
    private static final String SECRET = "test-pricing-secret"; // см. application-test.yml

    @Autowired private MockMvc mockMvc;
    @Autowired private ProductRepository products;
    @Autowired private MarketplacePriceRepository marketplacePrices;

    @BeforeEach
    void setUp() {
        marketplacePrices.deleteAll();
        products.deleteAll();

        products.save(variant("wb-1"));
        products.save(variant("wb-2"));
        products.save(variant("wb-3"));
    }

    private static Product variant(String id) {
        Product p = new Product();
        p.setId(id);
        p.setTitle("Пальто " + id);
        p.setPrice(new BigDecimal("25000"));
        p.setActive(true);
        return p;
    }

    private static String item(String productId, String source, Long buyerKop, Long costKop, String checkedAt) {
        StringBuilder sb = new StringBuilder("{\"productId\":\"").append(productId).append('"');
        if (source != null) sb.append(",\"source\":\"").append(source).append('"');
        if (buyerKop != null) sb.append(",\"buyerPriceKop\":").append(buyerKop);
        if (costKop != null) sb.append(",\"costPriceKop\":").append(costKop);
        if (checkedAt != null) sb.append(",\"checkedAt\":\"").append(checkedAt).append('"');
        return sb.append('}').toString();
    }

    private static String batch(String... items) {
        return "{\"items\":[" + String.join(",", items) + "]}";
    }

    // ============================================================ 1. приём и числа

    @Test
    void aBatchOfSeveralLinesIsAcceptedAndTheResponseCarriesNumbers() throws Exception {
        String body = batch(
                item("wb-1", "ozon", 623000L, 145000L, "2026-09-14T18:00:00Z"),
                // Себестоимость без пары с площадкой: ни source, ни checkedAt —
                // площадку по этой строке не спрашивали вовсе.
                item("wb-2", null, null, 98000L, null)
        );

        mockMvc.perform(post(URL).header("X-Pricing-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accepted").value(2))
                .andExpect(jsonPath("$.updated").value(2))
                .andExpect(jsonPath("$.unchanged").value(0))
                .andExpect(jsonPath("$.skipped").value(0))
                .andExpect(jsonPath("$.rejected").value(0))
                .andExpect(jsonPath("$.errors").isEmpty());
    }

    // ============================================================ 2. идемпотентность

    @Test
    void repeatingTheSameBatchChangesNothing_verifiedByReadingTheDatabaseAfterTheSecondCall() throws Exception {
        String body = batch(
                item("wb-1", "ozon", 623000L, 145000L, "2026-09-14T18:00:00Z"),
                item("wb-2", null, null, 98000L, null)
        );

        mockMvc.perform(post(URL).header("X-Pricing-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());

        assertThat(marketplacePrices.count()).isEqualTo(2);
        MarketplacePrice wb1AfterFirst = marketplacePrices.findByProductIdAndSource("wb-1", "ozon").orElseThrow();
        MarketplacePrice wb2AfterFirst = marketplacePrices.findByProductIdAndSourceIsNull("wb-2").orElseThrow();

        mockMvc.perform(post(URL).header("X-Pricing-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accepted").value(2))
                .andExpect(jsonPath("$.updated").value(0))
                .andExpect(jsonPath("$.unchanged").value(2))
                .andExpect(jsonPath("$.skipped").value(0));

        // Не код ответа — чтение из базы после второго вызова, как требует приёмка.
        assertThat(marketplacePrices.count()).isEqualTo(2);
        MarketplacePrice wb1AfterSecond = marketplacePrices.findByProductIdAndSource("wb-1", "ozon").orElseThrow();
        MarketplacePrice wb2AfterSecond = marketplacePrices.findByProductIdAndSourceIsNull("wb-2").orElseThrow();

        assertThat(wb1AfterSecond.getId()).isEqualTo(wb1AfterFirst.getId());
        assertThat(wb1AfterSecond.getBuyerPriceKop()).isEqualTo(wb1AfterFirst.getBuyerPriceKop());
        assertThat(wb1AfterSecond.getCostPriceKop()).isEqualTo(wb1AfterFirst.getCostPriceKop());
        assertThat(wb1AfterSecond.getCheckedAt()).isEqualTo(wb1AfterFirst.getCheckedAt());
        assertThat(wb2AfterSecond.getId()).isEqualTo(wb2AfterFirst.getId());
        assertThat(wb2AfterSecond.getCostPriceKop()).isEqualTo(wb2AfterFirst.getCostPriceKop());
    }

    // ============================================================ 3-6. форма строки

    @Test
    void aRowWithNeitherPriceIsRejected_fieldCarriesTheIndex() throws Exception {
        String body = batch(
                item("wb-1", "ozon", 623000L, 145000L, "2026-09-14T18:00:00Z"),
                item("wb-2", null, null, null, null)
        );

        mockMvc.perform(post(URL).header("X-Pricing-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("items[1].atLeastOnePricePresent"));

        assertThat(marketplacePrices.count()).isZero();
    }

    @Test
    void sourceWithoutCheckedAtIsRejected() throws Exception {
        // Источник без отметки опроса: сказано «это с площадки», не сказано
        // когда её спрашивали. Пара обязана ездить целиком.
        String body = batch(item("wb-1", "ozon", null, 145000L, null));

        mockMvc.perform(post(URL).header("X-Pricing-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("items[0].platformPairTravelsTogether"));
    }

    @Test
    void checkedAtWithoutSourceIsRejected() throws Exception {
        // Симметрично: отметка опроса без указания, кого спрашивали.
        String body = batch(item("wb-1", null, null, 145000L, "2026-09-14T18:00:00Z"));

        mockMvc.perform(post(URL).header("X-Pricing-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("items[0].platformPairTravelsTogether"));
    }

    @Test
    void unknownSourceIsRejected() throws Exception {
        String body = batch(item("wb-1", "avito", 623000L, null, "2026-09-14T18:00:00Z"));

        mockMvc.perform(post(URL).header("X-Pricing-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("items[0].source"));
    }

    @Test
    void buyerPriceWithoutThePlatformPairIsRejected() throws Exception {
        // checkedAt опущен вместе с source — иначе строка ловит сразу два
        // нарушения и индекс ошибки в errors[0] перестаёт быть однозначным.
        String body = batch(item("wb-1", null, 623000L, null, null));

        mockMvc.perform(post(URL).header("X-Pricing-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("items[0].buyerPriceCarriesPlatformPair"));
    }

    // НОЛЬ — НЕ ЦЕНА. Ozon кладёт "0.0000" в незаполненные поля цен, и такой
    // ноль, доехав до витрины, стал бы ценой: VariantPriceCalculator считает
    // источник пропавшим по null, а не по величине. Товар с включённым
    // переключателем встал бы по нулю. Отсекаем на границе, а не надеемся на
    // отправителя: у «не знаем» и «стоит ноль» не должно быть одной записи.
    @Test
    void zeroBuyerPriceIsRejected() throws Exception {
        String body = batch(item("wb-1", "ozon", 0L, 145000L, "2026-09-15T20:30:00Z"));

        mockMvc.perform(post(URL).header("X-Pricing-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("items[0].buyerPriceKop"));

        assertThat(marketplacePrices.count()).isZero();
    }

    @Test
    void zeroCostPriceIsRejected() throws Exception {
        String body = batch(item("wb-1", null, null, 0L, null));

        mockMvc.perform(post(URL).header("X-Pricing-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("items[0].costPriceKop"));
    }

    // ============================================================ 7. неизвестный вариант — пропуск, не отказ

    @Test
    void unknownProductIdIsSkipped_notRejected_otherRowsInTheBatchAreStillAccepted() throws Exception {
        // В аналитике артикулов больше, чем на витрине (172 vs 87) — это
        // обычный вечер, не мусор: skipped, rejected остаётся нулём, errors пуст.
        String body = batch(
                item("wb-1", "ozon", 623000L, 145000L, "2026-09-14T18:00:00Z"),
                item("wb-404", "ozon", 100000L, null, "2026-09-14T18:00:00Z"),
                item("wb-405", "ozon", 100000L, null, "2026-09-14T18:00:00Z")
        );

        mockMvc.perform(post(URL).header("X-Pricing-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accepted").value(1))
                .andExpect(jsonPath("$.skipped").value(2))
                .andExpect(jsonPath("$.rejected").value(0))
                .andExpect(jsonPath("$.errors").isEmpty());

        assertThat(marketplacePrices.findByProductIdAndSource("wb-1", "ozon")).isPresent();
        assertThat(marketplacePrices.count()).isEqualTo(1);
    }

    // ============================================================ 8. главное правило: не стирает

    @Test
    void aVariantMissingFromTheNewBatchKeepsItsPriorValues_verifiedByReadingTheDatabase() throws Exception {
        String firstBatch = batch(
                item("wb-1", "ozon", 623000L, 145000L, "2026-09-14T18:00:00Z"),
                item("wb-2", null, null, 98000L, null)
        );
        mockMvc.perform(post(URL).header("X-Pricing-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON).content(firstBatch))
                .andExpect(status().isOk());

        MarketplacePrice wb1Before = marketplacePrices.findByProductIdAndSource("wb-1", "ozon").orElseThrow();

        // Вторая пачка про wb-1 вообще не знает — только wb-3.
        String secondBatch = batch(item("wb-3", "wildberries", 900000L, null, "2026-09-15T09:00:00Z"));
        mockMvc.perform(post(URL).header("X-Pricing-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON).content(secondBatch))
                .andExpect(status().isOk());

        MarketplacePrice wb1After = marketplacePrices.findByProductIdAndSource("wb-1", "ozon").orElseThrow();
        assertThat(wb1After.getId()).isEqualTo(wb1Before.getId());
        assertThat(wb1After.getBuyerPriceKop()).isEqualTo(623000L);
        assertThat(wb1After.getCostPriceKop()).isEqualTo(145000L);
        assertThat(wb1After.getCheckedAt()).isEqualTo(wb1Before.getCheckedAt());
    }

    // ============================================================ 8b. «спросили, ответ негодный»

    // ТРЕТЬЕ СОСТОЯНИЕ ДОГОВОРА. «Вот цена» он умел, «цены никогда не было»
    // умел молчанием, а «была, и больше не знаем» сказать было нечем — и
    // молчание в этом случае консервировало неверную цену вместо того, чтобы
    // снять её. 15.09.2026 это перестало быть теоретическим: отправитель
    // научился не публиковать цену, разошедшуюся с деньгами покупателей.
    //
    // Проверяется СЛЕДСТВИЕМ, а не кодом ответа: читаем строку из базы.
    // Вторая часть проверки не менее важна первой — строка обязана остаться
    // ОДНОЙ. Отправить пустоту без источника нельзя именно потому, что ключ
    // уникальности `(product_id, coalesce(source,''))` развёл бы строку с
    // источником и строку без него, и старая цена уцелела бы по соседству.
    @Test
    void thePlatformPairWithoutABuyerPriceClearsThePriorPrice_andDoesNotCreateASecondRow() throws Exception {
        String first = batch(item("wb-1", "ozon", 2000000L, 115400L, "2026-09-15T12:00:00Z"));
        mockMvc.perform(post(URL).header("X-Pricing-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON).content(first))
                .andExpect(status().isOk());
        assertThat(marketplacePrices.findByProductIdAndSource("wb-1", "ozon").orElseThrow()
                .getBuyerPriceKop()).isEqualTo(2000000L);
        assertThat(marketplacePrices.count()).isEqualTo(1);

        // Площадку спросили, ответ негодный: пара на месте, цены нет.
        String second = batch(item("wb-1", "ozon", null, 115400L, "2026-09-15T20:30:00Z"));
        mockMvc.perform(post(URL).header("X-Pricing-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON).content(second))
                .andExpect(status().isOk());

        MarketplacePrice after = marketplacePrices.findByProductIdAndSource("wb-1", "ozon").orElseThrow();
        assertThat(after.getBuyerPriceKop()).isNull();
        // Себестоимость из нашего учёта и к площадке отношения не имеет — едет.
        assertThat(after.getCostPriceKop()).isEqualTo(115400L);
        assertThat(marketplacePrices.count()).isEqualTo(1);
    }

    // ============================================================ 9. секрет

    @Test
    void requestWithoutTheHeaderIsRejected() throws Exception {
        String body = batch(item("wb-1", "ozon", 623000L, 145000L, "2026-09-14T18:00:00Z"));

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());

        assertThat(marketplacePrices.count()).isZero();
    }

    @Test
    void requestWithTheWrongSecretIsRejected() throws Exception {
        String body = batch(item("wb-1", "ozon", 623000L, 145000L, "2026-09-14T18:00:00Z"));

        mockMvc.perform(post(URL).header("X-Pricing-Secret", "not-the-secret")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());

        assertThat(marketplacePrices.count()).isZero();
    }

    // ============================================================ 10. потолок пачки

    @Test
    void aBatchLongerThan500IsRejected() throws Exception {
        String body = batch(IntStream.range(0, 501)
                .mapToObj(i -> item("wb-1", "ozon", 623000L, 145000L, "2026-09-14T18:00:00Z"))
                .collect(Collectors.joining(",")));

        mockMvc.perform(post(URL).header("X-Pricing-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());

        assertThat(marketplacePrices.count()).isZero();
    }
}
