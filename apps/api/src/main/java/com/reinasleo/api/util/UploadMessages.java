package com.reinasleo.api.util;

/**
 * Тексты отказов загрузки. Общие, потому что отказать может и контроллер (свой
 * порог в 8 МБ), и резолвер multipart ещё до входа в контроллер (потолок тела
 * запроса в 64 МБ), а владелец в обоих случаях должен прочитать одно и то же.
 */
public final class UploadMessages {

    public static final String TELEGRAM_HINT =
            "Пришлите исходник в телеграм — сожму и верну готовый для витрины.";

    public static final String TOO_LARGE_FOR_THE_REQUEST =
            "Файл не влезает в запрос: потолок 64 МБ. " + TELEGRAM_HINT;

    private UploadMessages() {}
}
