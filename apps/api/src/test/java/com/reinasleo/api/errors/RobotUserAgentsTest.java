package com.reinasleo.api.errors;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Ошибки роботов не доходят до тревог (RobotUserAgents), а ошибки людей —
 * доходят. Вторая половина важнее первой: лишний пропущенный робот — одна
 * скрытая группа, а отрезанный покупатель — поломка, о которой мы не узнаем.
 */
class RobotUserAgentsTest {

    @ParameterizedTest
    @ValueSource(strings = {
            // Тот самый рендер-бот Bing из партии 27.09.
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/146.0.0.0 Safari/537.36",
            "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/146.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            "Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)",
            "Mozilla/5.0 (compatible; YandexMetrika/2.0; +http://yandex.com/bots)",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)",
            "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)",
            "TelegramBot (like TwitterBot)",
            "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
            "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse",
            "curl/8.7.1",
            "python-requests/2.32.3",
    })
    void robotsAreRecognised(String ua) {
        assertThat(RobotUserAgents.isRobot(ua)).as(ua).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 YaBrowser/25.8.0.0 Safari/537.36",
            "Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36",
            // Телефоны Cubot пишут своё имя в UA — «bot» подстрокой отрезал бы их.
            "Mozilla/5.0 (Linux; Android 13; CUBOT X30 Build/TP1A.220624.014) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0",
            "Mozilla/5.0 (Linux; Android 14; 23129RAA4G Build/UKQ1.231003.002) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.0.0 Mobile Safari/537.36 Telegram-Android/11.2.0",
    })
    void peopleAreNot(String ua) {
        assertThat(RobotUserAgents.isRobot(ua)).as(ua).isFalse();
    }

    @Test
    void noUserAgentIsNotARobot() {
        assertThat(RobotUserAgents.isRobot(null)).isFalse();
        assertThat(RobotUserAgents.isRobot("")).isFalse();
    }

    @Test
    void theHourlyCountResetsAfterItIsReported() {
        RobotUserAgents robots = new RobotUserAgents();
        robots.drop();
        robots.drop();
        assertThat(robots.droppedSinceLastReport()).isEqualTo(2);
        robots.reportHourly();
        assertThat(robots.droppedSinceLastReport()).isZero();
    }
}
