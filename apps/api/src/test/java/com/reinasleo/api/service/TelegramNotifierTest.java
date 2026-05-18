package com.reinasleo.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.lang.reflect.Field;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TelegramNotifierTest {

    @Mock private HttpClient httpClient;
    @Mock private HttpResponse<String> response;

    private TelegramNotifier notifier;

    @BeforeEach
    void setUp() throws Exception {
        notifier = new TelegramNotifier(httpClient, new ObjectMapper(), "https://api.test.local");
        setBotToken("123:TEST_TOKEN");
    }

    private void setBotToken(String token) throws Exception {
        Field f = TelegramNotifier.class.getDeclaredField("botToken");
        f.setAccessible(true);
        f.set(notifier, token);
    }

    @Test
    void sendDeleteChallenge_2xx_postsToTelegramAndDoesNotThrow() throws Exception {
        when(response.statusCode()).thenReturn(200);
        when(httpClient.send(any(HttpRequest.class), any())).thenReturn(response);

        notifier.sendDeleteChallenge(123456789L, "123456");

        ArgumentCaptor<HttpRequest> req = ArgumentCaptor.forClass(HttpRequest.class);
        verify(httpClient, times(1)).send(req.capture(), any());
        HttpRequest sent = req.getValue();
        assertThat(sent.uri().toString())
                .isEqualTo("https://api.test.local/bot123:TEST_TOKEN/sendMessage");
        assertThat(sent.method()).isEqualTo("POST");
        assertThat(sent.headers().firstValue("Content-Type")).contains("application/json");
    }

    @Test
    void sendDeleteChallenge_nullTelegramId_skipsHttpCall() throws Exception {
        notifier.sendDeleteChallenge(null, "123456");

        verify(httpClient, never()).send(any(), any());
    }

    @Test
    void sendDeleteChallenge_missingToken_skipsHttpCall() throws Exception {
        setBotToken("");

        notifier.sendDeleteChallenge(123456789L, "123456");

        verify(httpClient, never()).send(any(), any());
    }

    @Test
    void sendDeleteChallenge_4xx_doesNotRetryAndDoesNotThrow() throws Exception {
        when(response.statusCode()).thenReturn(400);
        when(response.body()).thenReturn("{\"ok\":false,\"description\":\"Bad Request\"}");
        when(httpClient.send(any(HttpRequest.class), any())).thenReturn(response);

        notifier.sendDeleteChallenge(123456789L, "123456");

        verify(httpClient, times(1)).send(any(), any());
    }

    @Test
    void sendDeleteChallenge_5xx_retriesUpToThreeTimes() throws Exception {
        when(response.statusCode()).thenReturn(503);
        when(httpClient.send(any(HttpRequest.class), any())).thenReturn(response);

        notifier.sendDeleteChallenge(123456789L, "123456");

        verify(httpClient, times(3)).send(any(), any());
    }

    @Test
    void sendDeleteChallenge_ioError_retriesAndSwallowsException() throws Exception {
        when(httpClient.send(any(HttpRequest.class), any()))
                .thenThrow(new IOException("connection refused"));

        notifier.sendDeleteChallenge(123456789L, "123456");

        verify(httpClient, times(3)).send(any(), any());
    }

    @Test
    void sendDeleteChallenge_5xxThenSuccess_stopsRetrying() throws Exception {
        HttpResponse<String> fail = mock(HttpResponse.class);
        when(fail.statusCode()).thenReturn(502);
        HttpResponse<String> ok = mock(HttpResponse.class);
        when(ok.statusCode()).thenReturn(200);
        when(httpClient.send(any(HttpRequest.class), any()))
                .thenReturn(fail)
                .thenReturn(ok);

        notifier.sendDeleteChallenge(123456789L, "123456");

        verify(httpClient, times(2)).send(any(), any());
    }

    @Test
    void sendDeleteChallenge_emptyCode_skipsHttpCall() throws Exception {
        notifier.sendDeleteChallenge(123456789L, "");

        verify(httpClient, never()).send(any(), any());
    }
}
