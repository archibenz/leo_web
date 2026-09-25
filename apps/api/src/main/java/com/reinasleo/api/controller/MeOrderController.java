package com.reinasleo.api.controller;

import com.reinasleo.api.dto.OrderResponse;
import com.reinasleo.api.model.User;
import com.reinasleo.api.service.OrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Только история заказов. Оформление из корзины (POST /checkout) удалено
// 25.09 (lw-8i33): оно считало сырое products.price мимо калькулятора
// витрины, из веба его никто не звал, а живым оставалось вторым источником
// цены. Заказ с оплатой — POST /api/checkout (CheckoutService).
@RestController
@RequestMapping("/api/me/orders")
public class MeOrderController {

    private final OrderService orderService;

    public MeOrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public ResponseEntity<List<OrderResponse>> getOrders(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(orderService.getOrders(user));
    }

}
