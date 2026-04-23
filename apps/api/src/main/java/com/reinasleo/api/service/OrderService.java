package com.reinasleo.api.service;

import com.reinasleo.api.dto.OrderItemResponse;
import com.reinasleo.api.dto.OrderResponse;
import com.reinasleo.api.exception.OutOfStockException;
import com.reinasleo.api.model.*;
import com.reinasleo.api.repository.CartRepository;
import com.reinasleo.api.repository.OrderRepository;
import com.reinasleo.api.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final AnalyticsService analyticsService;

    public OrderService(OrderRepository orderRepository,
                        CartRepository cartRepository,
                        ProductRepository productRepository,
                        AnalyticsService analyticsService) {
        this.orderRepository = orderRepository;
        this.cartRepository = cartRepository;
        this.productRepository = productRepository;
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

        for (CartItem ci : cart.getItems()) {
            String productId = ci.getProduct().getId();
            Product locked = productRepository.findByIdForUpdate(productId)
                    .orElseThrow(() -> new IllegalStateException("Product not found: " + productId));

            if (ci.getQuantity() > locked.getStockQuantity()) {
                throw new OutOfStockException(locked.getId(), ci.getQuantity(), locked.getStockQuantity());
            }

            locked.setStockQuantity(locked.getStockQuantity() - ci.getQuantity());
            productRepository.save(locked);
        }

        BigDecimal total = cart.getItems().stream()
                .map(i -> i.getProduct().getPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Order order = new Order(user, total);
        for (CartItem ci : cart.getItems()) {
            OrderItem oi = new OrderItem(order, ci.getProduct(), ci.getSize(),
                    ci.getQuantity(), ci.getProduct().getPrice());
            order.getItems().add(oi);

            analyticsService.trackEvent(user, ci.getProduct(), "purchase");
        }

        orderRepository.save(order);

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
