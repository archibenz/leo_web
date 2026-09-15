package com.reinasleo.api.controller;

import com.reinasleo.api.dto.MarketplacePriceIntakeRequest;
import com.reinasleo.api.dto.MarketplacePriceIntakeResponse;
import com.reinasleo.api.exception.UnauthorizedException;
import com.reinasleo.api.service.MarketplacePriceIntakeService;
import jakarta.annotation.PostConstruct;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

// Приём цен от соседней базы аналитики — тем же приёмом, что и телеграм-бот
// (см. BotController.validateSecret): секрет-заголовок, а не JWT, потому что
// вызывающая сторона не пользователь. Путь публичный в SecurityConfig
// (permitAll), реальная проверка — здесь, MessageDigest.isEqual вместо
// String.equals, чтобы сравнение не утекало через время ответа.
@RestController
@RequestMapping("/api/integrations/marketplace-prices")
public class MarketplacePriceIntakeController {

    private final MarketplacePriceIntakeService marketplacePriceIntakeService;

    @Value("${app.pricing.intake-secret}")
    private String pricingIntakeSecret;

    public MarketplacePriceIntakeController(MarketplacePriceIntakeService marketplacePriceIntakeService) {
        this.marketplacePriceIntakeService = marketplacePriceIntakeService;
    }

    @PostConstruct
    void validatePricingSecretConfigured() {
        if (pricingIntakeSecret == null || pricingIntakeSecret.isBlank()) {
            throw new IllegalStateException(
                    "PRICING_INTAKE_SECRET env var is required — refusing to start. "
                            + "An empty value would bypass intake auth and open /api/integrations/marketplace-prices.");
        }
    }

    private void validateSecret(String secret) {
        if (secret == null || !MessageDigest.isEqual(
                secret.getBytes(StandardCharsets.UTF_8),
                pricingIntakeSecret.getBytes(StandardCharsets.UTF_8))) {
            throw new UnauthorizedException("invalid_pricing_secret");
        }
    }

    @PostMapping
    public ResponseEntity<MarketplacePriceIntakeResponse> intake(
            @RequestHeader("X-Pricing-Secret") String secret,
            @Valid @RequestBody MarketplacePriceIntakeRequest request) {
        validateSecret(secret);
        return ResponseEntity.ok(marketplacePriceIntakeService.intake(request.items()));
    }
}
