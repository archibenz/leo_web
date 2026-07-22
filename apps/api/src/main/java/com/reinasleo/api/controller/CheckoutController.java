package com.reinasleo.api.controller;

import com.reinasleo.api.dto.CheckoutRequest;
import com.reinasleo.api.dto.CheckoutResponse;
import com.reinasleo.api.model.User;
import com.reinasleo.api.service.CheckoutService;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Guest checkout: аноним допускается (route permitAll), авторизованный юзер
 * прикрепляется к заказу через @AuthenticationPrincipal (null для гостя).
 */
@RestController
@RequestMapping("/api/checkout")
public class CheckoutController {

    private final CheckoutService checkoutService;

    public CheckoutController(CheckoutService checkoutService) {
        this.checkoutService = checkoutService;
    }

    @PostMapping
    public ResponseEntity<CheckoutResponse> checkout(@Valid @RequestBody CheckoutRequest request,
                                                     @AuthenticationPrincipal User user) {
        CheckoutResponse response = checkoutService.createOrder(request, user);
        return ResponseEntity
                .ok()
                .cacheControl(CacheControl.noStore())
                .body(response);
    }
}
