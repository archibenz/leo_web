package com.reinasleo.api.model;

/**
 * Курьерская служба из списка 8 поддерживаемых через Apiship aggregator.
 * Используется в orders.delivery_provider и delivery_shipments.provider.
 *
 * OTHER — escape valve: если Apiship добавит новую службу до redeploy,
 * её provider_key сохраняется в orders.delivery_provider_meta JSONB, а
 * enum-значение OTHER. Это предотвращает blocking новых services на
 * стороне Apiship.
 */
public enum DeliveryProvider {
    CDEK,
    BOXBERRY,
    POCHTA,
    FIVEPOST,
    YANDEX,
    PEK,
    DALLI,
    OZON_DELIVERY,
    OTHER;

    /**
     * Mapping из Apiship providerKey в наш enum.
     * См. https://docs.apiship.ru — список providerKey'ев.
     */
    public static DeliveryProvider fromApishipKey(String apishipKey) {
        if (apishipKey == null) return OTHER;
        return switch (apishipKey.toLowerCase()) {
            case "cdek" -> CDEK;
            case "boxberry" -> BOXBERRY;
            case "pochta", "russianpost" -> POCHTA;
            case "fivepost", "5post" -> FIVEPOST;
            case "yandex", "yandexdelivery" -> YANDEX;
            case "pek" -> PEK;
            case "dalli", "dalliservice" -> DALLI;
            case "ozon", "ozondelivery", "ozonrocket" -> OZON_DELIVERY;
            default -> OTHER;
        };
    }

    /**
     * Display name для UI (russian).
     */
    public String displayName() {
        return switch (this) {
            case CDEK -> "СДЭК";
            case BOXBERRY -> "Boxberry";
            case POCHTA -> "Почта России";
            case FIVEPOST -> "5post";
            case YANDEX -> "Яндекс Доставка";
            case PEK -> "ПЭК";
            case DALLI -> "Dalli";
            case OZON_DELIVERY -> "OZON Доставка";
            case OTHER -> "Другая служба";
        };
    }
}
