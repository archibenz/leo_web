package com.reinasleo.api.dto;

public record PollAuthResponse(String status, String token) {

    public static PollAuthResponse pending() {
        return new PollAuthResponse("pending", null);
    }

    public static PollAuthResponse ready(String token) {
        return new PollAuthResponse("ready", token);
    }
}
