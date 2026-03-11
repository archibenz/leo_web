package com.reinasleo.api.dto;

public record NewsletterPreferencesRequest(
        boolean promos,
        boolean collections,
        boolean projects
) {}
