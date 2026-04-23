package com.reinasleo.api.exception;

public class TokenAlreadyConsumedException extends RuntimeException {
    public TokenAlreadyConsumedException() {
        super("Token already consumed or expired");
    }
}
