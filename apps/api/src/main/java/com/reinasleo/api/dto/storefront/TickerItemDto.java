package com.reinasleo.api.dto.storefront;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Одна строка бегущей строки на витрине — уже отфильтрованный владельцем текст, без правил показа: языком и датой распоряжается фронтенд (lib/catalogue/select.ts), сервер отдаёт список как есть. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record TickerItemDto(String ru, String en, String href, String until) {}
