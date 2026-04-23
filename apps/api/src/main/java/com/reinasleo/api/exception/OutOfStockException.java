package com.reinasleo.api.exception;

public class OutOfStockException extends RuntimeException {
    private final String productId;
    private final int requestedQuantity;
    private final int availableStock;

    public OutOfStockException(String productId, int requested, int available) {
        super("Requested " + requested + " of product " + productId + " but only " + available + " available");
        this.productId = productId;
        this.requestedQuantity = requested;
        this.availableStock = available;
    }

    public String getProductId() { return productId; }
    public int getRequestedQuantity() { return requestedQuantity; }
    public int getAvailableStock() { return availableStock; }
}
