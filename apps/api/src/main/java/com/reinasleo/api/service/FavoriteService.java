package com.reinasleo.api.service;

import com.reinasleo.api.dto.FavoriteResponse;
import com.reinasleo.api.exception.NotFoundException;
import com.reinasleo.api.model.Favorite;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.FavoriteRepository;
import com.reinasleo.api.repository.ProductRepository;
import com.reinasleo.api.service.storefront.ShopperPrices;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final ProductRepository productRepository;
    private final AnalyticsService analyticsService;
    // Цена — та, что на витрине (скидка, цена площадки), а не сырое products.price.
    private final ShopperPrices shopperPrices;

    public FavoriteService(FavoriteRepository favoriteRepository,
                           ProductRepository productRepository,
                           AnalyticsService analyticsService,
                           ShopperPrices shopperPrices) {
        this.favoriteRepository = favoriteRepository;
        this.productRepository = productRepository;
        this.analyticsService = analyticsService;
        this.shopperPrices = shopperPrices;
    }

    @Transactional(readOnly = true)
    public List<FavoriteResponse> getFavorites(User user) {
        List<Favorite> favorites = favoriteRepository.findByUserId(user.getId());
        Map<String, BigDecimal> shown = shopperPrices.shown(favorites.stream().map(Favorite::getProduct).toList());
        return favorites.stream()
                .map(f -> toResponse(f, shown.get(f.getProduct().getId())))
                .toList();
    }

    @Transactional
    public FavoriteResponse addFavorite(User user, String productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new NotFoundException("product_not_found"));

        var existing = favoriteRepository.findByUserIdAndProductId(user.getId(), productId);
        BigDecimal shown = shopperPrices.shown(List.of(product)).get(product.getId());
        if (existing.isPresent()) {
            return toResponse(existing.get(), shown);
        }

        Favorite fav = favoriteRepository.save(new Favorite(user, product));
        analyticsService.trackEvent(user, product, "add_to_favorite");
        return toResponse(fav, shown);
    }

    @Transactional
    public void removeFavorite(User user, String productId) {
        favoriteRepository.findByUserIdAndProductId(user.getId(), productId)
                .ifPresent(favoriteRepository::delete);
    }

    private FavoriteResponse toResponse(Favorite fav, BigDecimal shownPrice) {
        return new FavoriteResponse(
                fav.getProduct().getId(),
                fav.getProduct().getTitle(),
                shownPrice,
                fav.getProduct().getImage(),
                fav.getCreatedAt());
    }
}
