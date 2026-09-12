package com.reinasleo.api.dto.admin.storefront;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Сторож адресов медиа гоняется на плохом входе, а не только на хорошем:
 * до этих тестов он пропускал `//чужой-хост`, хотя javadoc обещал отказ.
 * Каждая ветка запрета закрыта своим случаем — иначе соседняя сломается молча.
 */
class MediaUrlTest {

    private static final Pattern P = Pattern.compile(MediaUrl.PATTERN);

    @ParameterizedTest
    @ValueSource(strings = {
            "/images/white/hero.jpg",
            "/videos/white/hero-desktop.mp4",
            "/uploads/products/8f1c-4d.png",
    })
    @DisplayName("свой путь проходит")
    void localPathPasses(String url) {
        assertThat(P.matcher(url).matches()).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            // Протокол-относительный: браузер развернёт его во внешний адрес.
            // Ради этого случая тест и написан.
            "//evil.com/x.jpg",
            "///evil.com/x.jpg",
            // Схема целиком.
            "https://evil.com/x.jpg",
            "http://evil.com/x.jpg",
            "javascript:alert(1)",
            "data:image/png;base64,AAAA",
            // Выход вверх по дереву.
            "/images/../../etc/passwd",
            "/..",
            // Относительный путь без ведущего слэша.
            "images/white/hero.jpg",
            "",
    })
    @DisplayName("чужой источник и выход из дерева отбиваются")
    void foreignOrEscapingRejected(String url) {
        assertThat(P.matcher(url).matches()).isFalse();
    }
}
