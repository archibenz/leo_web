package com.reinasleo.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CheckoutAddressRequest(
        @NotBlank(message = "City is required")
        @Size(max = 120, message = "City too long")
        String city,

        @NotBlank(message = "Street is required")
        @Size(max = 255, message = "Street too long")
        String street,

        @NotBlank(message = "House is required")
        @Size(max = 32, message = "House too long")
        String house,

        @Size(max = 32, message = "Apartment too long")
        String apartment,

        @Size(max = 500, message = "Comment too long")
        String comment
) { }
