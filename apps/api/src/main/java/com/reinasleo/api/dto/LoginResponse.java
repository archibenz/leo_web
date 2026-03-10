package com.reinasleo.api.dto;

import java.util.UUID;

public record LoginResponse(
        String token,
        UUID id,
        String email,
        String name,
        String surname,
        String role
) {}
