package com.reinasleo.api.errors;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Маска текста ошибки перед отправкой в аналитику. Каждый кейс — реальная
 * форма секрета, которая может оказаться в сообщении исключения; каждый
 * обязан краснеть, если снять своё правило.
 */
class SecretMaskTest {

    @Test
    void aJwtIsMasked() {
        String jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk";
        assertThat(SecretMask.mask("bad token " + jwt + " rejected")).isEqualTo("bad token *** rejected");
    }

    @Test
    void aBearerHeaderIsMasked() {
        assertThat(SecretMask.mask("Authorization: Bearer abc123DEF456ghi")).doesNotContain("abc123DEF456ghi");
    }

    @Test
    void namedSecretsAreMaskedInKeyValueAndJson() {
        assertThat(SecretMask.mask("login failed password=hunter2&x=1")).isEqualTo("login failed password=***&x=1");
        assertThat(SecretMask.mask("{\"token\": \"s3cr3t-value\"}")).isEqualTo("{\"token\": \"***\"}");
        assertThat(SecretMask.mask("X-Ingest-Secret: topsecret1")).doesNotContain("topsecret1");
        assertThat(SecretMask.mask("rl_session=abc.def.ghi")).doesNotContain("abc.def.ghi");
    }

    @Test
    void personalDataIsMasked() {
        assertThat(SecretMask.mask("no user buyer@example.com")).isEqualTo("no user ***");
        assertThat(SecretMask.mask("sms to +7 (999) 123-45-67 failed")).isEqualTo("sms to *** failed");
        assertThat(SecretMask.mask("sms to 89991234567 failed")).isEqualTo("sms to *** failed");
    }

    @Test
    void unnamedLongSecretsAreMasked() {
        assertThat(SecretMask.mask("key 0123456789abcdef0123456789abcdef used")).isEqualTo("key *** used");
        assertThat(SecretMask.mask("blob QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlq end")).isEqualTo("blob *** end");
    }

    // Маска не должна съедать то, по чему ошибку потом ищут.
    @Test
    void ordinaryTextAndStackFramesSurvive() {
        assertThat(SecretMask.mask("Order not found")).isEqualTo("Order not found");
        assertThat(SecretMask.mask("CheckoutService.createOrder:123")).isEqualTo("CheckoutService.createOrder:123");
        assertThat(SecretMask.mask("/api/admin/products/{id}")).isEqualTo("/api/admin/products/{id}");
        assertThat(SecretMask.mask("timeout after 15000 ms")).isEqualTo("timeout after 15000 ms");
    }

    @Test
    void clipsToTheLimit() {
        assertThat(SecretMask.maskAndClip("слово ".repeat(120), 500)).hasSize(500);
        assertThat(SecretMask.maskAndClip(null, 500)).isNull();
    }
}
