package com.reinasleo.api.errors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicLong;
import java.util.regex.Pattern;

/**
 * Ошибки от роботов в аналитику не идут. Первая настоящая партия сторожа
 * (27.09): 11 групп ChunkLoadError на /en/contact одним POST от рендер-бота
 * Bing («HeadlessChrome/146», сеть Microsoft) — он рендерит страницу, снятую
 * раньше, и не догружает её скрипты. Покупателей это не касалось, а тревога
 * ушла бы владельцу.
 *
 * Решает сервер по User-Agent самого POST; тело ему не указ. Сам UA дальше по
 * прежнему не пересылается — в событии только семейство браузера. Отброшенное
 * считается и раз в час пишется в журнал, без тревоги: если роботов вдруг
 * станет много, это видно, но будить никого не нужно.
 *
 * «bot» ищется не подстрокой: телефоны Cubot пишут «CUBOT X30» в свой UA, и
 * это живые покупатели. Роботы подписываются «Имяbot/версия» или «bot»
 * отдельным словом.
 */
@Component
public class RobotUserAgents {

    private static final Logger log = LoggerFactory.getLogger(RobotUserAgents.class);

    static final Pattern ROBOT = Pattern.compile(
            "headless|[a-z]bot/|\\bbot\\b|bot\\.html?|crawl|spider|slurp|bingpreview|"
                    + "yandex(bot|images|metrika|webmaster|mobilebot)|googlebot|google-inspectiontool|"
                    + "mediapartners-google|adsbot|lighthouse|pagespeed|chrome-lighthouse|"
                    + "facebookexternalhit|telegrambot|whatsapp|python-requests|python-urllib|"
                    + "curl/|wget/|phantomjs|puppeteer|playwright|selenium|webdriver",
            Pattern.CASE_INSENSITIVE);

    private final AtomicLong dropped = new AtomicLong();

    public static boolean isRobot(String userAgent) {
        return userAgent != null && ROBOT.matcher(userAgent).find();
    }

    /** Отметить отброшенную пачку. */
    public void drop() {
        dropped.incrementAndGet();
    }

    long droppedSinceLastReport() {
        return dropped.get();
    }

    @Scheduled(fixedRate = 3_600_000, initialDelay = 3_600_000)
    void reportHourly() {
        long n = dropped.getAndSet(0);
        if (n > 0) log.info("client-errors: за час отброшено {} пачек от роботов", n);
    }
}
