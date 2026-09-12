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

    public static final String UNREADABLE_IMAGE =
            "Не удалось разобрать картинку — файл повреждён или это не изображение. "
                    + "Подойдут JPG и PNG. Если это снимок с айфона в формате HEIC, "
                    + "переключите камеру на «Наиболее совместимый» или пришлите его в телеграм.";

    public static final String IMAGE_TOO_LARGE =
            "Снимок тяжелее 32 МБ. " + TELEGRAM_HINT;

    // WebP в этой JVM нечем раскодировать, значит нечем и уменьшить. Поднять для
    // него предел значило бы положить на витрину тяжёлый кадр — ровно то, ради
    // чего уменьшение и заводилось.
    public static final String WEBP_NOT_RESIZED =
            "WebP тяжелее 10 МБ мы не уменьшаем — нечем. Пришлите JPG или PNG, их сожмём сами.";

    public static final String NOT_AN_IMAGE =
            "Это не картинка. Подойдут JPG, PNG и WebP.";

    private UploadMessages() {}
}
