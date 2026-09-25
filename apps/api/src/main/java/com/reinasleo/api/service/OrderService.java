package com.reinasleo.api.service;

import com.reinasleo.api.dto.OrderItemResponse;
import com.reinasleo.api.dto.OrderResponse;
import com.reinasleo.api.model.*;
import com.reinasleo.api.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class OrderService {

    private final OrderRepository orderRepository;

    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getOrders(User user) {
        return orderRepository.findTop50ByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(this::toResponse)
                .toList();
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
