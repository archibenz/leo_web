package com.reinasleo.api.client;

import com.fasterxml.jackson.annotation.JsonProperty;

public record YooKassaConfirmationRequest(
        String type,
        @JsonProperty("return_url") String returnUrl
) {
    public static YooKassaConfirmationRequest redirect(String returnUrl) {
        return new YooKassaConfirmationRequest("redirect", returnUrl);
    }
}
