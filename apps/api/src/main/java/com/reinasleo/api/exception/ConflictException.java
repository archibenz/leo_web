package com.reinasleo.api.exception;

public class ConflictException extends RuntimeException {
    private final String code;

    public ConflictException(String code) {
        super(code);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
