package com.reinasleo.api.dto;

import java.util.Set;

// Закрытый список типов событий сайта — должен оставаться в шаге с
// ck_site_events_event_type (V34__site_events.sql) и с закрытым списком на
// витрине. Две копии неизбежны (DB CHECK защищает от прямых INSERT мимо API,
// эта — от него самого), как category/WHITE_CATS в V32.
public final class SiteEventTypes {

    public static final String EVENT_TYPE_PATTERN =
            "^(page_view|product_view|marketplace_click|add_to_cart|add_to_favourite|checkout_start|signup)$";

    // user_id пишем только для событий, которые и так требуют входа — для
    // просмотров и клика на маркетплейс никогда, даже если запрос пришёл от
    // залогиненного визитёра (решение владельца, план 2026-09-13).
    public static final Set<String> REQUIRES_USER =
            Set.of("add_to_cart", "add_to_favourite", "checkout_start", "signup");

    private SiteEventTypes() {}
}
