package com.reinasleo.api.repository;

import com.reinasleo.api.model.MarketplacePrice;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
@ActiveProfiles("test")
class MarketplacePriceRepositoryTest {

    @Autowired private MarketplacePriceRepository marketplacePrices;

    private static MarketplacePrice row(String productId, String source, Long buyerKop, Long costKop) {
        MarketplacePrice row = new MarketplacePrice();
        row.setProductId(productId);
        row.setSource(source);
        row.setBuyerPriceKop(buyerKop);
        row.setCostPriceKop(costKop);
        row.setCapturedAt(Instant.parse("2026-09-14T18:00:00Z"));
        row.setReceivedAt(Instant.now());
        return row;
    }

    @Test
    void save_assignsIdAndPersistsFields() {
        MarketplacePrice saved = marketplacePrices.save(row("wb-1", "ozon", 623000L, 145000L));

        assertThat(saved.getId()).isNotNull();
        MarketplacePrice reloaded = marketplacePrices.findById(saved.getId()).orElseThrow();
        assertThat(reloaded.getProductId()).isEqualTo("wb-1");
        assertThat(reloaded.getSource()).isEqualTo("ozon");
        assertThat(reloaded.getBuyerPriceKop()).isEqualTo(623000L);
        assertThat(reloaded.getCostPriceKop()).isEqualTo(145000L);
    }

    // Это ровно тот гвоздь, ради которого findByProductIdAndSourceIsNull
    // существует отдельно от findByProductIdAndSource(id, null): у 55 из 87
    // вариантов себестоимость приходит без source (NULL), и JPA-производный
    // findByProductIdAndSource(id, null) в SQL превращается в "source = NULL",
    // что никогда не истинно — такая строка молча "не находится".
    @Test
    void findByProductIdAndSourceIsNull_findsTheCostOnlyRow_notTheSourcedOne() {
        marketplacePrices.save(row("wb-1", null, null, 145000L));
        marketplacePrices.save(row("wb-1", "ozon", 623000L, null));

        MarketplacePrice costOnly = marketplacePrices.findByProductIdAndSourceIsNull("wb-1").orElseThrow();
        assertThat(costOnly.getSource()).isNull();
        assertThat(costOnly.getCostPriceKop()).isEqualTo(145000L);
        assertThat(costOnly.getBuyerPriceKop()).isNull();
    }

    @Test
    void findByProductIdAndSource_doesNotCrossMatchTheNullSourceRow() {
        marketplacePrices.save(row("wb-1", null, null, 145000L));
        marketplacePrices.save(row("wb-1", "ozon", 623000L, null));

        MarketplacePrice sourced = marketplacePrices.findByProductIdAndSource("wb-1", "ozon").orElseThrow();
        assertThat(sourced.getBuyerPriceKop()).isEqualTo(623000L);

        assertThat(marketplacePrices.findByProductIdAndSource("wb-1", "wildberries")).isEmpty();
    }

    // Три строки на один вариант одновременно — ozon, wildberries и
    // себестоимость без источника — не запрещены схемой; ключ (product_id,
    // source) их различает, и ничего в этом уровне не мешает им сосуществовать.
    @Test
    void aSingleProductCanCarryUpToThreeIndependentRows() {
        marketplacePrices.save(row("wb-1", null, null, 145000L));
        marketplacePrices.save(row("wb-1", "ozon", 623000L, null));
        marketplacePrices.save(row("wb-1", "wildberries", 900000L, null));

        assertThat(marketplacePrices.findByProductIdAndSourceIsNull("wb-1")).isPresent();
        assertThat(marketplacePrices.findByProductIdAndSource("wb-1", "ozon")).isPresent();
        assertThat(marketplacePrices.findByProductIdAndSource("wb-1", "wildberries")).isPresent();
    }
}
