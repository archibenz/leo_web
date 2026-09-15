package com.reinasleo.api.exception;

import java.util.List;

/**
 * Отказ сохранить цену ниже себестоимости.
 *
 * Слово владельца 15.09.2026: продавать ниже себестоимости нельзя «ни руками,
 * ни автоматом». Автомат закрыт этапом 2 — VariantPriceCalculator урезает
 * скидку порогом себестоимости (см. его тест thresholdApplied_resultEqualsCost).
 * Это исключение закрывает вторую половину: ручную запись цены.
 *
 * НЕСЁТ СПИСОК, А НЕ ОДИН КОД, и это требование, а не удобство. Владелец
 * сохраняет модель с несколькими цветовыми вариантами разом; отказ по одному
 * заставил бы его чинить их по очереди, каждый раз узнавая о следующем только
 * после новой попытки. BadRequestException для этого не годится — у него ровно
 * один код.
 *
 * Форма ответа нарочно та же, что у проверки полей
 * (RestExceptionHandler.handleValidation): {message, errors:[{field,message}]}.
 * У витрины для неё уже есть разбор (components/editor/tickerFieldErrors.ts,
 * extractApiFieldErrors), то есть новый вид отказа ей показывать нечем не
 * придётся.
 */
public class BelowCostException extends RuntimeException {

    /**
     * @param field   путь к полю в том же виде, в каком его отдаёт проверка
     *                полей: «price» для админской формы, «variants[wb-1].price»
     *                для редактора на странице — чтобы витрина могла подсветить
     *                именно тот вариант, а не форму целиком.
     * @param message текст владельцу, уже с числами: без них «нельзя ниже
     *                себестоимости» не говорит, насколько он промахнулся.
     */
    public record Violation(String field, String message) {}

    private final List<Violation> violations;

    public BelowCostException(List<Violation> violations) {
        super("price below cost");
        this.violations = List.copyOf(violations);
    }

    public List<Violation> getViolations() {
        return violations;
    }
}
