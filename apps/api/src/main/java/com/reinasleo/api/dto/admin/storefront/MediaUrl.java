package com.reinasleo.api.dto.admin.storefront;

/**
 * Витрина показывает только свои файлы. Любой адрес со схемой (`javascript:`,
 * `https://`, `//чужой-хост`) и любой выход вверх по дереву (`..`) — отказ:
 * редактор правит содержимое, а не источник загрузки страницы.
 */
public final class MediaUrl {

    public static final String PATTERN = "^/(?!.*\\.\\.)[A-Za-z0-9._/-]+$";
    public static final String MESSAGE = "media url must be a local /path without ..";

    private MediaUrl() {}
}
