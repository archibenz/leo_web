package com.reinasleo.api.dto;

public record BotCheckUserResponse(
        boolean registered,
        String name
) {}
