package com.reinasleo.api.dto;

import java.util.UUID;

public record CheckoutResponse(UUID orderId, String confirmationUrl) { }
