package com.reinasleo.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Пачка ошибок веба (браузер или серверный рендер Next) для AppErrorCollector.
 * Строки сервер всё равно маскирует и обрезает сам; пределы здесь — защита от
 * пачки-мусора, а не формат приёма аналитики.
 */
public record ClientErrorBatchRequest(@NotEmpty @Size(max = 20) List<@Valid Item> events) {

    public record Item(
            @NotBlank @Size(max = 40) String kind,
            @Size(max = 400) String errorClass,
            @Size(max = 2000) String message,
            @Size(max = 20) List<@Size(max = 400) String> frames,
            @Size(max = 300) String route,
            @Min(100) @Max(599) Integer status,
            @Size(max = 60) String browser,
            @Size(max = 60) String release,
            @Min(1) @Max(1000) Integer count
    ) {}
}
