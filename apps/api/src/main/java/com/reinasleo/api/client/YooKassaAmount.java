package com.reinasleo.api.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.math.RoundingMode;

@JsonIgnoreProperties(ignoreUnknown = true)
public record YooKassaAmount(String value, String currency) {

    public static YooKassaAmount rub(BigDecimal amount) {
        return new YooKassaAmount(amount.setScale(2, RoundingMode.HALF_UP).toPlainString(), "RUB");
    }
}
