package com.reinasleo.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LinkEmailRequest(
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(min = 6, max = 128) String password,
        @NotBlank @Size(min = 6, max = 6) String code
) {}
