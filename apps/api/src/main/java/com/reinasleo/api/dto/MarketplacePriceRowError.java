package com.reinasleo.api.dto;

// Та же форма {field, message}, что отдаёт RestExceptionHandler.handleValidation
// — отправитель разбирает её одним и тем же кодом независимо от того, упал ли
// запрос целиком на Bean Validation или конкретная строка отклонена сервисом.
// field несёт индекс строки пачки ("items[3].productId") — без него из 87
// строк не понять, какая плоха.
public record MarketplacePriceRowError(String field, String message) {}
