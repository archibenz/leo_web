package com.reinasleo.api.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record YooKassaConfirmationResponse(
        String type,
        @JsonProperty("confirmation_url") String confirmationUrl
) { }
