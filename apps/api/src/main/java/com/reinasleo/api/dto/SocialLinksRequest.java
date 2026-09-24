package com.reinasleo.api.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record SocialLinksRequest(@NotNull List<SocialLink> links) {}
