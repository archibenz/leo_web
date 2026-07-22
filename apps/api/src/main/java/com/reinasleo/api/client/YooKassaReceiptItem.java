package com.reinasleo.api.client;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Позиция фискального чека 54-ФЗ (ОФД на стороне YooKassa).
 * vat_code 1 = без НДС; payment_subject commodity + payment_mode
 * full_payment — обычный товар с полной оплатой при заказе.
 */
public record YooKassaReceiptItem(
        String description,
        String quantity,
        YooKassaAmount amount,
        @JsonProperty("vat_code") int vatCode,
        @JsonProperty("payment_subject") String paymentSubject,
        @JsonProperty("payment_mode") String paymentMode
) {
    public static YooKassaReceiptItem commodity(String description, int quantity, YooKassaAmount unitAmount) {
        return new YooKassaReceiptItem(description, quantity + ".00", unitAmount, 1, "commodity", "full_payment");
    }
}
