package com.reinasleo.api.service;

import com.reinasleo.api.dto.OrderItemResponse;
import com.reinasleo.api.dto.OrderResponse;
import com.reinasleo.api.model.*;
import com.reinasleo.api.repository.CartRepository;
import com.reinasleo.api.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final CartRepository cartRepository;
    private final AnalyticsService analyticsService;

    public OrderService(OrderRepository orderRepository,
                        CartRepository cartRepository,
                        AnalyticsService analyticsService) {
        this.orderRepository = orderRepository;
        this.cartRepository = cartRepository;
        this.analyticsService = analyticsService;
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getOrders(User user) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public OrderResponse checkout(User user) {
        Cart cart = cartRepository.findByUserId(user.getId())
                .orElseThrow(() -> new IllegalStateException("Cart is empty"));

        if (cart.getItems().isEmpty()) {
            throw new IllegalStateException("Cart is empty");
        }

        // Calculate total
        BigDecimal total = cart.getItems().stream()
                .map(i -> i.getProduct().getPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Create order
        Order order = new Order(user, total);
        for (CartItem ci : cart.getItems()) {
            OrderItem oi = new OrderItem(order, ci.getProduct(), ci.getSize(),
                    ci.getQuantity(), ci.getProduct().getPrice());
            order.getItems().add(oi);

            // Track purchase analytics
            analyticsService.trackEvent(user, ci.getProduct(), "purchase");
        }

        orderRepository.save(order);

        // Clear cart
        cart.getItems().clear();
        cartRepository.save(cart);

        return toResponse(order);
    }

    private OrderResponse toResponse(Order order) {
        List<OrderItemResponse> items = order.getItems().stream()
                .map(i -> new OrderItemResponse(
                        i.getProduct().getId(),
                        i.getProduct().getTitle(),
                        i.getSize(),
                        i.getQuantity(),
                        i.getPrice()))
                .toList();
        return new OrderResponse(order.getId(), order.getStatus(), order.getTotal(),
                items, order.getCreatedAt());
    }
}
