package com.reinasleo.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reinasleo.api.exception.EmailDeliveryException;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.lang.reflect.Field;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    private static final String DURATION = "reinasleo.email.resend.duration";
    private static final String RETRIES = "reinasleo.email.resend.retries";
    private static final String STATUS = "reinasleo.email.resend.status";

    @Mock private HttpClient httpClient;
    @Mock private HttpResponse<String> response;

    private EmailService emailService;
    private MeterRegistry meterRegistry;

    @BeforeEach
    void setUp() throws Exception {
        meterRegistry = new SimpleMeterRegistry();
        emailService = new EmailService(httpClient, new ObjectMapper(), meterRegistry);
        setField("resendApiKey", "test-key");
        setField("fromAddress", "REINASLEO <noreply@reinasleo.com>");
    }

    private void setField(String name, String value) throws Exception {
        Field f = EmailService.class.getDeclaredField(name);
        f.setAccessible(true);
        f.set(emailService, value);
    }

    private Timer timer(String outcome) {
        return meterRegistry.find(DURATION).tag("outcome", outcome).timer();
    }

    @Test
    void sendVerificationCode_2xx_recordsSuccessTimerAndStatus2xx() throws Exception {
        when(response.statusCode()).thenReturn(202);
        doReturn(response).when(httpClient).send(any(HttpRequest.class), any());

        boolean ok = emailService.sendVerificationCode("user@example.com", "123456");

        assertThat(ok).isTrue();
        verify(httpClient, times(1)).send(any(), any());

        Timer successTimer = timer("success");
        assertThat(successTimer).isNotNull();
        assertThat(successTimer.count()).isEqualTo(1L);

        assertThat(meterRegistry.counter(STATUS, "status_class", "2xx").count()).isEqualTo(1.0);
        assertThat(meterRegistry.counter(STATUS, "status_class", "4xx").count()).isZero();
        assertThat(meterRegistry.counter(STATUS, "status_class", "5xx").count()).isZero();

        // First-attempt success — retry counters must stay at zero.
        assertThat(meterRegistry.counter(RETRIES, "attempt", "2").count()).isZero();
        assertThat(meterRegistry.counter(RETRIES, "attempt", "3").count()).isZero();
    }

    @Test
    void sendVerificationCode_4xx_failsFastAndTagsClientError() throws Exception {
        when(response.statusCode()).thenReturn(400);
        when(response.body()).thenReturn("{\"name\":\"validation_error\"}");
        doReturn(response).when(httpClient).send(any(HttpRequest.class), any());

        assertThatThrownBy(() -> emailService.sendVerificationCode("user@example.com", "123456"))
                .isInstanceOf(EmailDeliveryException.class);

        verify(httpClient, times(1)).send(any(), any());

        Timer clientErrorTimer = timer("client_error");
        assertThat(clientErrorTimer).isNotNull();
        assertThat(clientErrorTimer.count()).isEqualTo(1L);

        assertThat(meterRegistry.counter(STATUS, "status_class", "4xx").count()).isEqualTo(1.0);
        assertThat(meterRegistry.counter(RETRIES, "attempt", "2").count()).isZero();
    }

    @Test
    void sendVerificationCode_5xxAlways_retriesThreeTimesAndCountsRetries() throws Exception {
        when(response.statusCode()).thenReturn(502);
        doReturn(response).when(httpClient).send(any(HttpRequest.class), any());

        assertThatThrownBy(() -> emailService.sendVerificationCode("user@example.com", "123456"))
                .isInstanceOf(EmailDeliveryException.class);

        verify(httpClient, times(3)).send(any(), any());

        Timer serverErrorTimer = timer("server_error");
        assertThat(serverErrorTimer).isNotNull();
        assertThat(serverErrorTimer.count()).isEqualTo(3L);

        assertThat(meterRegistry.counter(STATUS, "status_class", "5xx").count()).isEqualTo(3.0);
        assertThat(meterRegistry.counter(RETRIES, "attempt", "2").count()).isEqualTo(1.0);
        assertThat(meterRegistry.counter(RETRIES, "attempt", "3").count()).isEqualTo(1.0);
    }

    @Test
    void sendVerificationCode_ioErrorAlways_tagsTransportErrorAndCountsRetries() throws Exception {
        doThrow(new IOException("boom"))
                .when(httpClient).send(any(HttpRequest.class), any());

        assertThatThrownBy(() -> emailService.sendVerificationCode("user@example.com", "123456"))
                .isInstanceOf(EmailDeliveryException.class);

        verify(httpClient, times(3)).send(any(), any());

        Timer transportTimer = timer("transport_error");
        assertThat(transportTimer).isNotNull();
        assertThat(transportTimer.count()).isEqualTo(3L);

        assertThat(meterRegistry.counter(RETRIES, "attempt", "2").count()).isEqualTo(1.0);
        assertThat(meterRegistry.counter(RETRIES, "attempt", "3").count()).isEqualTo(1.0);
    }

    @Test
    void sendVerificationCode_5xxThenSuccess_stopsRetryingAfterSecondAttempt() throws Exception {
        HttpResponse<String> fail = mock(HttpResponse.class);
        when(fail.statusCode()).thenReturn(503);
        HttpResponse<String> ok = mock(HttpResponse.class);
        when(ok.statusCode()).thenReturn(200);
        doReturn(fail).doReturn(ok).when(httpClient).send(any(HttpRequest.class), any());

        boolean result = emailService.sendVerificationCode("user@example.com", "123456");

        assertThat(result).isTrue();
        verify(httpClient, times(2)).send(any(), any());

        assertThat(meterRegistry.counter(RETRIES, "attempt", "2").count()).isEqualTo(1.0);
        assertThat(meterRegistry.counter(RETRIES, "attempt", "3").count()).isZero();

        assertThat(timer("success").count()).isEqualTo(1L);
        assertThat(timer("server_error").count()).isEqualTo(1L);
    }
}
