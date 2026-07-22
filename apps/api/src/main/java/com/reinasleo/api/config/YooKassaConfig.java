package com.reinasleo.api.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Configuration
@EnableConfigurationProperties(YooKassaProperties.class)
public class YooKassaConfig {

    public static final String BASE_URL = "https://api.yookassa.ru/v3";
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    @Bean
    public RestClient yooKassaRestClient(YooKassaProperties properties) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(TIMEOUT);
        factory.setReadTimeout(TIMEOUT);
        return RestClient.builder()
                .baseUrl(BASE_URL)
                .requestFactory(factory)
                .defaultHeader(HttpHeaders.AUTHORIZATION, basicAuth(properties))
                .build();
    }

    // Public: YooKassaClientTest собирает такой же RestClient поверх MockRestServiceServer.
    public static String basicAuth(YooKassaProperties properties) {
        String shopId = properties.shopId() == null ? "" : properties.shopId();
        String secretKey = properties.secretKey() == null ? "" : properties.secretKey();
        return "Basic " + HttpHeaders.encodeBasicAuth(shopId, secretKey, StandardCharsets.UTF_8);
    }
}
