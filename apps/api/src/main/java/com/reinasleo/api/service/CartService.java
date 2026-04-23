package com.reinasleo.api.service;

import com.reinasleo.api.dto.CartItemRequest;
import com.reinasleo.api.dto.CartItemResponse;
import com.reinasleo.api.dto.CartResponse;
import com.reinasleo.api.dto.UpdateCartItemRequest;
import com.reinasleo.api.exception.OutOfStockException;
import com.reinasleo.api.model.*;
import com.reinasleo.api.repository.CartItemRepository;
import com.reinasleo.api.repository.CartRepository;
import com.reinasleo.api.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final AnalyticsService analyticsService;

    public CartService(CartRepository cartRepository,
                       CartItemRepository cartItemRepository,
                       ProductRepository productRepository,
                       AnalyticsService analyticsService) {
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
        this.analyticsService = analyticsService;
    }

    @Transactional(readOnly = true)
    public CartResponse getCart(User user) {
        Cart cart = cartRepository.findByUserId(user.getId()).orElse(null);
        if (cart == null) {
            return new CartResponse(List.of(), 0, BigDecimal.ZERO);
        }
        return toCartResponse(cart);
    }

    @Transactional
    public CartResponse addItem(User user, CartItemRequest request) {
        Product product = productRepository.findById(request.productId())
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + request.productId()));

        Cart cart = cartRepository.findByUserId(user.getId())
                .orElseGet(() -> cartRepository.save(new Cart(user)));

        var existing = cartItemRepository.findByCartIdAndProductIdAndSize(
                cart.getId(), request.productId(), request.size());

        int existingQty = existing.map(CartItem::getQuantity).orElse(0);
        int newQty = existingQty + request.quantity();
        if (newQty > product.getStockQuantity()) {
            throw new OutOfStockException(product.getId(), newQty, product.getStockQuantity());
        }

        if (existing.isPresent()) {
            existing.get().setQuantity(newQty);
        } else {
            CartItem item = new CartItem(cart, product, request.size(), request.quantity());
            cart.getItems().add(item);
        }

        cartRepository.save(cart);
        analyticsService.trackEvent(user, product, "add_to_cart");
        return toCartResponse(cart);
    }

    @Transactional
    public CartResponse updateItem(User user, UUID itemId, UpdateCartItemRequest request) {
        Cart cart = cartRepository.findByUserId(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Cart not found"));

        CartItem item = cart.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Cart item not found"));

        Product product = item.getProduct();
        if (request.quantity() > product.getStockQuantity()) {
            throw new OutOfStockException(product.getId(), request.quantity(), product.getStockQuantity());
        }

        item.setQuantity(request.quantity());
        cartRepository.save(cart);
        return toCartResponse(cart);
    }

    @Transactional
    public CartResponse removeItem(User user, UUID itemId) {
        Cart cart = cartRepository.findByUserId(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Cart not found"));

        cart.getItems().removeIf(i -> i.getId().equals(itemId));
        cartRepository.save(cart);
        return toCartResponse(cart);
    }

    @Transactional
    public void clearCart(User user) {
        cartRepository.findByUserId(user.getId()).ifPresent(cart -> {
            cart.getItems().clear();
            cartRepository.save(cart);
        });
    }

    private CartResponse toCartResponse(Cart cart) {
        List<CartItemResponse> items = cart.getItems().stream()
                .map(i -> new CartItemResponse(
                        i.getId(),
                        i.getProduct().getId(),
                        i.getProduct().getTitle(),
                        i.getProduct().getPrice(),
                        i.getProduct().getImage(),
                        i.getSize(),
                        i.getQuantity()))
                .toList();

        int totalItems = items.stream().mapToInt(CartItemResponse::quantity).sum();
        BigDecimal totalPrice = items.stream()
                .map(i -> i.productPrice().multiply(BigDecimal.valueOf(i.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new CartResponse(items, totalItems, totalPrice);
    }
}
