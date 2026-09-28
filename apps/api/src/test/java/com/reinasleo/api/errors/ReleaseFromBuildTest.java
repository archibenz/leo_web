package com.reinasleo.api.errors;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Релиз в отчётах об ошибках API — sha12 коммита сборки, если APP_RELEASE не
 * задан (так на проде). До 28.09 здесь было unknown: не понять, какая сборка
 * упала. Коммит зашивает Gradle (generateBuildRelease), читает application.yml.
 */
@SpringBootTest
@ActiveProfiles("test")
class ReleaseFromBuildTest {

    @Autowired private AppErrorCollector collector;

    @Test
    void withoutAppReleaseTheCollectorCarriesTheBuildCommit() {
        assertThat(System.getenv("APP_RELEASE")).as("тест про случай без APP_RELEASE").isNull();
        assertThat(collector.release()).matches("^[0-9a-f]{12}$");
    }
}
