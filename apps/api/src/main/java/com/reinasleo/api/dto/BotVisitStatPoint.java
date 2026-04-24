package com.reinasleo.api.dto;

import java.time.LocalDate;

public record BotVisitStatPoint(
        LocalDate date,
        long count,
        long uniqueUsers
) {}
