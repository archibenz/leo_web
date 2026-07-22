package com.reinasleo.api.client;

import java.util.List;

public record YooKassaReceipt(YooKassaReceiptCustomer customer, List<YooKassaReceiptItem> items) { }
