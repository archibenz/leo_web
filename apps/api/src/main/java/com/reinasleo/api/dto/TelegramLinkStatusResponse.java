package com.reinasleo.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.UUID;

public record TelegramLinkStatusResponse(
        @JsonProperty("schema_version") int schemaVersion,
        @JsonProperty("site_user_id") UUID siteUserId,
        boolean linked,
        boolean verified,
        @JsonProperty("verified_until") Instant verifiedUntil) {}
