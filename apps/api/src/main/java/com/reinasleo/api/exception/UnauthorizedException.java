package com.reinasleo.api.exception;

public class UnauthorizedException extends RuntimeException {
    private final String code;

    public UnauthorizedException(String code) {
        super(code);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
