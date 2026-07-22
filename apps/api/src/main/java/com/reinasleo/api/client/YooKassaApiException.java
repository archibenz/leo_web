package com.reinasleo.api.client;

/**
 * Ошибка вызова YooKassa API. status = HTTP статус ответа провайдера,
 * 0 — транспортная ошибка (timeout / connect refused). Mapped в
 * RestExceptionHandler на HTTP 502 — транзакция checkout'а откатывается.
 */
public class YooKassaApiException extends RuntimeException {

    private final int status;

    public YooKassaApiException(String message, int status, Throwable cause) {
        super(message, cause);
        this.status = status;
    }

    public YooKassaApiException(String message, int status) {
        this(message, status, null);
    }

    public int getStatus() {
        return status;
    }

    public boolean isNotFound() {
        return status == 404;
    }
}
