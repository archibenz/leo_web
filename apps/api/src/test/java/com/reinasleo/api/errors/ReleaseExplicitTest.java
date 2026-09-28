package com.reinasleo.api.errors;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

/** Явный APP_RELEASE побеждает коммит сборки (application.yml). */
@SpringBootTest(properties = "APP_RELEASE=v9.9.9")
@ActiveProfiles("test")
class ReleaseExplicitTest {

    @Autowired private AppErrorCollector collector;

    @Test
    void anExplicitAppReleaseWins() {
        assertThat(collector.release()).isEqualTo("v9.9.9");
    }
}
