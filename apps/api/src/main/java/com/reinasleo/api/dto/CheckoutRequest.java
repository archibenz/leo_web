package com.reinasleo.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CheckoutRequest(
        @NotEmpty(message = "Items are required")
        @Size(max = 50, message = "Too many items")
        List<@Valid @NotNull CheckoutItemRequest> items,

        @NotBlank(message = "Email is required")
        @Email(message = "Email must be valid")
        @Size(max = 160, message = "Email too long")
        String email,

        @NotBlank(message = "Phone is required")
        @Size(max = 32, message = "Phone too long")
        String phone,

        @Size(max = 120, message = "Name too long")
        String name,

        @NotNull(message = "Delivery address is required")
        @Valid CheckoutAddressRequest deliveryAddress
) { }
