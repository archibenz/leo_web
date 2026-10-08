package com.reinasleo.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.UUID;

public record AnalyticsSessionResponse(
        @JsonProperty("schema_version") int schemaVersion,
        @JsonProperty("site_user_id") UUID siteUserId,
        @JsonProperty("telegram_id") long telegramId,
        @JsonProperty("telegram_verified") boolean telegramVerified,
        @JsonProperty("is_admin") boolean isAdmin,
        @JsonProperty("telegram_username") String telegramUsername,
        @JsonProperty("expires_at") Instant expiresAt) {}
