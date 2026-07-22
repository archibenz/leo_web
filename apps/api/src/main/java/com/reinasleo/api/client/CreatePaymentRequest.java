package com.reinasleo.api.client;

import java.util.Map;

public record CreatePaymentRequest(
        YooKassaAmount amount,
        boolean capture,
        YooKassaConfirmationRequest confirmation,
        String description,
        Map<String, String> metadata,
        YooKassaReceipt receipt
) { }
