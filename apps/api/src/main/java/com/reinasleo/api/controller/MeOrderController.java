package com.reinasleo.api.controller;

import com.reinasleo.api.dto.OrderResponse;
import com.reinasleo.api.model.User;
import com.reinasleo.api.service.OrderService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    @PostMapping("/checkout")
    public ResponseEntity<OrderResponse> checkout(@AuthenticationPrincipal User user) {
        OrderResponse order = orderService.checkout(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(order);
    }
}
