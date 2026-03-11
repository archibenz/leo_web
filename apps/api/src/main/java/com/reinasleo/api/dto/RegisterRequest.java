package com.reinasleo.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record RegisterRequest(
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        @Size(max = 255, message = "Email must be at most 255 characters")
        String email,

        @NotBlank(message = "Verification code is required")
        @Size(min = 6, max = 6, message = "Code must be 6 digits")
        String code,

        @NotBlank(message = "First name is required")
        @Size(min = 2, max = 40, message = "First name must be between 2 and 40 characters")
        String firstName,

        @Size(min = 2, max = 40, message = "Surname must be between 2 and 40 characters")
        String surname,

        @NotBlank(message = "Password is required")
        @Size(min = 6, max = 128, message = "Password must be between 6 and 128 characters")
        String password,

        LocalDate dateOfBirth,

        boolean newsletter,
        boolean newsletterPromos,
        boolean newsletterCollections,
        boolean newsletterProjects,

        @NotNull(message = "Privacy policy must be accepted")
        Boolean privacyAccepted
) {}
