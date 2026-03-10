package com.reinasleo.api.controller;

import com.reinasleo.api.dto.FavoriteResponse;
import com.reinasleo.api.model.User;
import com.reinasleo.api.service.FavoriteService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/me/favorites")
public class MeFavoriteController {

    private final FavoriteService favoriteService;

    public MeFavoriteController(FavoriteService favoriteService) {
        this.favoriteService = favoriteService;
    }

    @GetMapping
    public ResponseEntity<List<FavoriteResponse>> getFavorites(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(favoriteService.getFavorites(user));
    }

    @PostMapping("/{productId}")
    public ResponseEntity<FavoriteResponse> addFavorite(@AuthenticationPrincipal User user,
                                                        @PathVariable String productId) {
        return ResponseEntity.ok(favoriteService.addFavorite(user, productId));
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<Void> removeFavorite(@AuthenticationPrincipal User user,
                                                @PathVariable String productId) {
        favoriteService.removeFavorite(user, productId);
        return ResponseEntity.noContent().build();
    }
}
