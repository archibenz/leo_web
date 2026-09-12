package com.reinasleo.api.service.storefront;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Сброс кэша Next после публикации — против сервера, который ведёт себя как Next.
 *
 * Слушатель здесь НАРОЧНО рвёт соединение на попытке апгрейда до h2c: именно так
 * отвечает Node, на котором стоит Next. Клиент Java по умолчанию берёт HTTP_2 и
 * просит этот апгрейд первым делом — с таким клиентом запрос падает, сброс не
 * происходит, и правка доезжает до покупателя не за минуту, а за десять. Заглушка,
 * принимающая что угодно, этого не ловит; эта — ловит.
 *
 * Утверждения — не только на записанном сервером заголовке, но и на исходе
 * клиента (через ListAppender на логгере самого NextRevalidator): фальшивый
 * слушатель обязан вычитать запрос ЦЕЛИКОМ, прежде чем отвечать, — закрытие
 * сокета с непрочитанным телом шлёт RST, и клиент может увидеть «Connection
 * reset» вместо честного 200. Не вычитывай тест тело сам, предупреждение
 * "Failed to drop the Next storefront cache" внутри этого самого теста прошло
 * бы незамеченным — а чинили мы ровно это.
 */
class NextRevalidatorTest {

    private final Logger logger = (Logger) LoggerFactory.getLogger(NextRevalidator.class);
    private final ListAppender<ILoggingEvent> logs = new ListAppender<>();

    @BeforeEach
    void captureLogs() {
        logs.start();
        logger.addAppender(logs);
    }

    @AfterEach
    void releaseLogs() {
        logger.detachAppender(logs);
        logs.stop();
        logs.list.clear();
    }

    @Test
    void theCacheResetReachesAServerThatRefusesTheHttp2UpgradeAndTheClientSeesNoWarning() throws Exception {
        List<String> heads = new ArrayList<>();
        CountDownLatch arrived = new CountDownLatch(1);

        try (ServerSocket server = new ServerSocket(0)) {
            Thread listener = new Thread(() -> {
                try {
                    heads.add(acceptDrainAndRespond(server, "HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nok"));
                } catch (Exception ignored) {
                    // соединение закрыто — так и задумано
                } finally {
                    arrived.countDown();
                }
            });
            listener.setDaemon(true);
            listener.start();

            NextRevalidator revalidator = new NextRevalidator();
            ReflectionTestUtils.setField(revalidator, "url", "http://127.0.0.1:" + server.getLocalPort() + "/api/revalidate");
            ReflectionTestUtils.setField(revalidator, "secret", "shared-secret");

            revalidator.storefrontChanged();

            assertThat(arrived.await(5, TimeUnit.SECONDS)).isTrue();
        }

        assertThat(heads).hasSize(1);
        String head = heads.get(0);
        assertThat(head).startsWith("POST /api/revalidate HTTP/1.1");
        assertThat(head.toLowerCase(Locale.ROOT)).doesNotContain("upgrade: h2c");
        assertThat(head).contains("X-Revalidate-Secret: shared-secret");

        // Исход клиента, а не только записанный сервером заголовок: RST на
        // недочитанном теле превратил бы честный 200 в «Connection reset», и
        // ровно это предупреждение здесь и проверяется — молчанием.
        assertThat(logs.list).isEmpty();
    }

    @Test
    void aNonTwoHundredResponseLogsExactlyOneWarningNamingTheStatus() throws Exception {
        CountDownLatch arrived = new CountDownLatch(1);

        try (ServerSocket server = new ServerSocket(0)) {
            Thread listener = new Thread(() -> {
                try {
                    acceptDrainAndRespond(server, "HTTP/1.1 500 Internal Server Error\r\nContent-Length: 0\r\n\r\n");
                } catch (Exception ignored) {
                    // соединение закрыто — так и задумано
                } finally {
                    arrived.countDown();
                }
            });
            listener.setDaemon(true);
            listener.start();

            NextRevalidator revalidator = new NextRevalidator();
            ReflectionTestUtils.setField(revalidator, "url", "http://127.0.0.1:" + server.getLocalPort() + "/api/revalidate");
            ReflectionTestUtils.setField(revalidator, "secret", "shared-secret");

            revalidator.storefrontChanged();

            assertThat(arrived.await(5, TimeUnit.SECONDS)).isTrue();
        }

        // Ровно одно предупреждение — не ноль (отказ сервера не должен пройти
        // тихо) и не больше одного (двойной лог на одну неудачу маскирует счёт
        // в мониторинге не хуже отсутствия лога).
        assertThat(logs.list).hasSize(1);
        assertThat(logs.list.get(0).getLevel()).isEqualTo(Level.WARN);
        assertThat(logs.list.get(0).getFormattedMessage()).contains("500");
    }

    @Test
    void withoutTheAddressAndSecretItLogsExactlyOneWarningInsteadOfPretending() {
        NextRevalidator revalidator = new NextRevalidator();
        ReflectionTestUtils.setField(revalidator, "url", "");
        ReflectionTestUtils.setField(revalidator, "secret", "");

        revalidator.storefrontChanged(); // не бросает и не висит

        assertThat(logs.list).hasSize(1);
        assertThat(logs.list.get(0).getLevel()).isEqualTo(Level.WARN);
        assertThat(logs.list.get(0).getFormattedMessage()).contains("WEB_REVALIDATE_URL");
    }

    // ---------------------------------------------------------------- фикстуры

    /**
     * Принимает одно соединение, вычитывает заголовки и (если это не
     * симулированный обрыв на апгрейде) тело целиком по Content-Length —
     * ОДНИМ и тем же BufferedReader, чтобы не потерять байты, которые он уже
     * мог утащить в свой внутренний буфер при чтении заголовков, — и только
     * потом пишет ответ. Возвращает записанные заголовки.
     */
    private static String acceptDrainAndRespond(ServerSocket server, String response) throws Exception {
        try (Socket socket = server.accept()) {
            BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
            StringBuilder head = new StringBuilder();
            String line;
            int contentLength = 0;
            while ((line = in.readLine()) != null && !line.isEmpty()) {
                head.append(line).append('\n');
                if (line.toLowerCase(Locale.ROOT).startsWith("content-length:")) {
                    contentLength = Integer.parseInt(line.substring(line.indexOf(':') + 1).trim());
                }
            }
            String headText = head.toString();
            if (headText.toLowerCase(Locale.ROOT).contains("upgrade: h2c")) {
                return headText; // ровно как Node: молча рвём соединение, не отвечая
            }

            char[] body = new char[contentLength];
            int total = 0;
            while (total < contentLength) {
                int n = in.read(body, total, contentLength - total);
                if (n < 0) {
                    break;
                }
                total += n;
            }

            socket.getOutputStream().write(response.getBytes(StandardCharsets.UTF_8));
            socket.getOutputStream().flush();
            return headText;
        }
    }
}
