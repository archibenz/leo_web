package com.reinasleo.api.dto;

import java.util.List;

// Ответ возвращает числа, а не только код 200: отправитель обязан проверять
// следствие своего вызова, а не верить статусу. accepted = updated +
// unchanged; rejected — строки, отклонённые сервисом уже после того, как
// прошли Bean Validation (сегодня единственная причина — неизвестный
// productId), errors несёт то же (field, message), что и 400 от
// RestExceptionHandler, включая индекс строки.
public record MarketplacePriceIntakeResponse(
        int accepted,
        int updated,
        int unchanged,
        int rejected,
        List<MarketplacePriceRowError> errors
) {}
