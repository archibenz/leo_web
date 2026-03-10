package com.reinasleo.api.service;

import com.reinasleo.api.dto.FavoriteResponse;
import com.reinasleo.api.model.Favorite;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.FavoriteRepository;
import com.reinasleo.api.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final ProductRepository productRepository;
    private final AnalyticsService analyticsService;

    public FavoriteService(FavoriteRepository favoriteRepository,
                           ProductRepository productRepository,
                           AnalyticsService analyticsService) {
        this.favoriteRepository = favoriteRepository;
        this.productRepository = productRepository;
        this.analyticsService = analyticsService;
    }

    @Transactional(readOnly = true)
    public List<FavoriteResponse> getFavorites(User user) {
        return favoriteRepository.findByUserId(user.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public FavoriteResponse addFavorite(User user, String productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + productId));

        var existing = favoriteRepository.findByUserIdAndProductId(user.getId(), productId);
        if (existing.isPresent()) {
            return toResponse(existing.get());
        }

        Favorite fav = favoriteRepository.save(new Favorite(user, product));
        analyticsService.trackEvent(user, product, "add_to_favorite");
        return toResponse(fav);
    }

    @Transactional
    public void removeFavorite(User user, String productId) {
        favoriteRepository.findByUserIdAndProductId(user.getId(), productId)
                .ifPresent(favoriteRepository::delete);
    }

    private FavoriteResponse toResponse(Favorite fav) {
        return new FavoriteResponse(
                fav.getProduct().getId(),
                fav.getProduct().getTitle(),
                fav.getProduct().getPrice(),
                fav.getProduct().getImage(),
                fav.getCreatedAt());
    }
}
