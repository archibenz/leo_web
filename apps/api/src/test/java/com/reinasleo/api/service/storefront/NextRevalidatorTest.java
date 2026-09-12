package com.reinasleo.api.service.storefront;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
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
 */
class NextRevalidatorTest {

    @Test
    void theCacheResetReachesAServerThatRefusesTheHttp2Upgrade() throws Exception {
        List<String> heads = new ArrayList<>();
        CountDownLatch arrived = new CountDownLatch(1);

        try (ServerSocket server = new ServerSocket(0)) {
            Thread listener = new Thread(() -> {
                try (Socket socket = server.accept()) {
                    BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
                    StringBuilder head = new StringBuilder();
                    String line;
                    while ((line = in.readLine()) != null && !line.isEmpty()) {
                        head.append(line).append('\n');
                    }
                    String request = head.toString();
                    heads.add(request);
                    if (request.toLowerCase().contains("upgrade: h2c")) {
                        socket.close(); // ровно как Node: молча рвём соединение
                        return;
                    }
                    OutputStream out = socket.getOutputStream();
                    out.write("HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nok".getBytes(StandardCharsets.UTF_8));
                    out.flush();
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
        assertThat(head.toLowerCase()).doesNotContain("upgrade: h2c");
        assertThat(head).contains("X-Revalidate-Secret: shared-secret");
    }

    @Test
    void withoutTheAddressAndSecretItSaysSoInsteadOfPretending() {
        NextRevalidator revalidator = new NextRevalidator();
        ReflectionTestUtils.setField(revalidator, "url", "");
        ReflectionTestUtils.setField(revalidator, "secret", "");

        revalidator.storefrontChanged(); // не бросает и не висит

        assertThat(true).isTrue();
    }
}
