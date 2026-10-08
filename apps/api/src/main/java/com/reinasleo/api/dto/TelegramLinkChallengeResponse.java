package com.reinasleo.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;

public record TelegramLinkChallengeResponse(
        @JsonProperty("challenge_token") String challengeToken,
        @JsonProperty("deep_link") String deepLink,
        @JsonProperty("expires_at") Instant expiresAt) {}
