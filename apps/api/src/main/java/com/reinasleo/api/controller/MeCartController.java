package com.reinasleo.api.controller;

import com.reinasleo.api.dto.CartItemRequest;
import com.reinasleo.api.dto.CartResponse;
import com.reinasleo.api.dto.UpdateCartItemRequest;
import com.reinasleo.api.model.User;
import com.reinasleo.api.service.CartService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/me/cart")
public class MeCartController {

    private final CartService cartService;

    public MeCartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    public ResponseEntity<CartResponse> getCart(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(cartService.getCart(user));
    }

    @PostMapping
    public ResponseEntity<CartResponse> addItem(@AuthenticationPrincipal User user,
                                                @Valid @RequestBody CartItemRequest request) {
        return ResponseEntity.ok(cartService.addItem(user, request));
    }

    @PatchMapping("/{itemId}")
    public ResponseEntity<CartResponse> updateItem(@AuthenticationPrincipal User user,
                                                   @PathVariable UUID itemId,
                                                   @Valid @RequestBody UpdateCartItemRequest request) {
        return ResponseEntity.ok(cartService.updateItem(user, itemId, request));
    }

    @DeleteMapping("/{itemId}")
    public ResponseEntity<CartResponse> removeItem(@AuthenticationPrincipal User user,
                                                   @PathVariable UUID itemId) {
        return ResponseEntity.ok(cartService.removeItem(user, itemId));
    }

    @DeleteMapping
    public ResponseEntity<Void> clearCart(@AuthenticationPrincipal User user) {
        cartService.clearCart(user);
        return ResponseEntity.noContent().build();
    }
}
