package com.reinasleo.api.service.storefront;

import com.reinasleo.api.model.Product;
import com.reinasleo.api.repository.MarketplacePriceRepository;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

/**
 * Цена, которую покупатель видит за вариант на витрине: VariantPrice.shownPrice()
 * (sale, иначе base) по тем же marketplace_prices. Одно место для корзины,
 * избранного и выгрузки данных пользователя — чтобы ни один экран не показал
 * покупателю другую цену, чем витрина и касса. null — цены нет (предзаказ).
 *
 * Касса (CheckoutService) считает тем же калькулятором сама: ей нужен срез под
 * блокировкой строк, а не отдельный запрос.
 */
@Component
public class ShopperPrices {

    private final MarketplacePriceRepository marketplacePrices;
    private final VariantPriceCalculator calculator;

    public ShopperPrices(MarketplacePriceRepository marketplacePrices, VariantPriceCalculator calculator) {
        this.marketplacePrices = marketplacePrices;
        this.calculator = calculator;
    }

    /** По id варианта; один срез marketplace_prices на все товары разом. */
    public Map<String, BigDecimal> shown(Collection<Product> products) {
        MarketplacePriceLookup prices = products.isEmpty()
                ? MarketplacePriceLookup.empty()
                : MarketplacePriceLookup.from(marketplacePrices.findByProductIdIn(
                        products.stream().map(Product::getId).distinct().toList()));
        Map<String, BigDecimal> out = new HashMap<>();
        for (Product p : products) {
            out.put(p.getId(), calculator.compute(p, prices).shownPrice());
        }
        return out;
    }
}
