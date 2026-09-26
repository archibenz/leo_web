package com.reinasleo.api.errors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.task.ThreadPoolTaskSchedulerCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Упавшая @Scheduled-задача (публикация чисел, досылка заказов, …) → app_error
 * kind "scheduled". По умолчанию Spring такое только пишет в лог и молча ждёт
 * следующего запуска — а лог сервера владелец не читает.
 */
@Configuration
public class ScheduledErrorReporting {

    private static final Logger log = LoggerFactory.getLogger(ScheduledErrorReporting.class);

    @Bean
    ThreadPoolTaskSchedulerCustomizer reportScheduledFailures(AppErrorCollector errors) {
        return scheduler -> scheduler.setErrorHandler(t -> {
            log.error("Scheduled task failed", t);
            errors.recordThrowable("scheduled", t, null, null, null);
        });
    }
}
