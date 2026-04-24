package com.reinasleo.api.dto;

import java.time.LocalDate;

public record RegistrationStatPoint(
        LocalDate date,
        long count
) {}
