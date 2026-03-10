package com.reinasleo.api.exception;

public class EmailAlreadyExistsException extends RuntimeException {
    public EmailAlreadyExistsException(String email) {
        super("Account with email '" + email + "' already exists");
    }
}
