package com.reinasleo.api.service;

import com.reinasleo.api.dto.CartItemRequest;
import com.reinasleo.api.dto.CartItemResponse;
import com.reinasleo.api.dto.CartResponse;
import com.reinasleo.api.dto.UpdateCartItemRequest;
import com.reinasleo.api.exception.BadRequestException;
import com.reinasleo.api.exception.ConflictException;
import com.reinasleo.api.exception.NotFoundException;
import com.reinasleo.api.exception.OutOfStockException;
import com.reinasleo.api.model.*;
import com.reinasleo.api.repository.CartItemRepository;
import com.reinasleo.api.repository.CartRepository;
import com.reinasleo.api.repository.MarketplacePriceRepository;
import com.reinasleo.api.repository.ProductRepository;
import com.reinasleo.api.service.storefront.MarketplacePriceLookup;
import com.reinasleo.api.service.storefront.VariantPriceCalculator;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final AnalyticsService analyticsService;
    // Цена строки — та же, что на витрине и в кассе (VariantPriceCalculator по
    // marketplace_prices), а не сырое products.price. До 25.09 корзина
    // показывала сырое (lw-8i33).
    private final MarketplacePriceRepository marketplacePrices;
    private final VariantPriceCalculator priceCalculator;
    // Proxy reference so addItem can invoke the @Transactional addItemAttempt via
    // the Spring proxy (direct this.addItemAttempt would bypass the interceptor).
    // Non-final so unit tests can substitute the same instance via reflection.
    private CartService self;

    public CartService(CartRepository cartRepository,
                       CartItemRepository cartItemRepository,
                       ProductRepository productRepository,
                       AnalyticsService analyticsService,
                       MarketplacePriceRepository marketplacePrices,
                       VariantPriceCalculator priceCalculator,
                       @Lazy CartService self) {
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
        this.analyticsService = analyticsService;
        this.marketplacePrices = marketplacePrices;
        this.priceCalculator = priceCalculator;
        this.self = self;
    }

    @Transactional(readOnly = true)
    public CartResponse getCart(User user) {
        Cart cart = cartRepository.findByUserId(user.getId()).orElse(null);
        if (cart == null) {
            return new CartResponse(List.of(), 0, BigDecimal.ZERO);
        }
        return toCartResponse(cart);
    }

    // Orchestrator — intentionally NOT @Transactional. Both attempts run in
    // their own fresh tx via the proxy, so a flush failure on the first attempt
    // cannot poison this method's persistence context (there is none).
    public CartResponse addItem(User user, CartItemRequest request) {
        try {
            return self.addItemAttempt(user, request);
        } catch (DataIntegrityViolationException firstAttempt) {
            // Concurrent addItem won the (cart_id, product_id, size) unique-index
            // race; replay against the row that committed first, in a fresh tx.
            try {
                return self.addItemAttempt(user, request);
            } catch (DataIntegrityViolationException secondAttempt) {
                // Three or more concurrent ops on the same cart compounded — surface
                // a typed 409 so the FE can show a retry toast instead of generic 500.
                throw new ConflictException("cart_concurrent_modification");
            }
        }
    }

    @Transactional
    public CartResponse addItemAttempt(User user, CartItemRequest request) {
        Product product = productRepository.findById(request.productId())
                .orElseThrow(() -> new NotFoundException("product_not_found"));

        Cart cart = cartRepository.findByUserId(user.getId())
                .orElseGet(() -> cartRepository.save(new Cart(user)));

        mergeAddItem(cart, product, request);

        analyticsService.trackEvent(user, product, "add_to_cart");
        return toCartResponse(cart);
    }

    private void mergeAddItem(Cart cart, Product product, CartItemRequest request) {
        // Тот же отказ, что в CheckoutService и OrderService: предзаказ без цены
        // не продаётся. Отказ стоит здесь, на входе в корзину, потому что
        // AdminProductService.updateStock может поднять остаток варианту без
        // цены — и строка корзины с price == null дошла бы до умножения.
        if (shownPrices(List.of(product)).get(product.getId()) == null) {
            throw new BadRequestException("product_not_for_sale");
        }

        var existing = cartItemRepository.findByCartIdAndProductIdAndSize(
                cart.getId(), product.getId(), request.size());

        int existingQty = existing.map(CartItem::getQuantity).orElse(0);
        int newQty = existingQty + request.quantity();
        if (newQty > product.getStockQuantity()) {
            throw new OutOfStockException(product.getId(), newQty, product.getStockQuantity());
        }

        if (existing.isPresent()) {
            CartItem row = existing.get();
            row.setQuantity(newQty);
            cartItemRepository.saveAndFlush(row);
            if (cart.getItems().stream().noneMatch(i -> i.getId() != null && i.getId().equals(row.getId()))) {
                cart.getItems().add(row);
            }
            return;
        }
        CartItem item = new CartItem(cart, product, request.size(), request.quantity());
        CartItem saved = cartItemRepository.saveAndFlush(item);
        cart.getItems().add(saved);
    }

    @Transactional
    public CartResponse updateItem(User user, UUID itemId, UpdateCartItemRequest request) {
        Cart cart = cartRepository.findByUserId(user.getId())
                .orElseThrow(() -> new NotFoundException("cart_not_found"));

        CartItem item = cart.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("cart_item_not_found"));

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
                .orElseThrow(() -> new NotFoundException("cart_not_found"));

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

    // Что покупатель видит за вариант на витрине: sale, иначе base. null —
    // цены нет (предзаказ). Один срез marketplace_prices на все товары разом.
    private Map<String, BigDecimal> shownPrices(List<Product> products) {
        MarketplacePriceLookup prices = products.isEmpty()
                ? MarketplacePriceLookup.empty()
                : MarketplacePriceLookup.from(marketplacePrices.findByProductIdIn(
                        products.stream().map(Product::getId).distinct().toList()));
        Map<String, BigDecimal> out = new HashMap<>();
        for (Product p : products) {
            out.put(p.getId(), priceCalculator.compute(p, prices).shownPrice());
        }
        return out;
    }

    private CartResponse toCartResponse(Cart cart) {
        Map<String, BigDecimal> shown = shownPrices(cart.getItems().stream().map(CartItem::getProduct).toList());
        List<CartItemResponse> items = cart.getItems().stream()
                .map(i -> new CartItemResponse(
                        i.getId(),
                        i.getProduct().getId(),
                        i.getProduct().getTitle(),
                        shown.get(i.getProduct().getId()),
                        i.getProduct().getImage(),
                        i.getSize(),
                        i.getQuantity()))
                .toList();

        int totalItems = items.stream().mapToInt(CartItemResponse::quantity).sum();
        // Строка, уложенная до запрета выше (или потерявшая цену в админке), не
        // имеет права уронить GET /api/cart: считаем её нулём, а цену показываем
        // как есть — покупатель видит «Предзаказ» вместо числа.
        BigDecimal totalPrice = items.stream()
                .map(i -> i.productPrice() == null
                        ? BigDecimal.ZERO
                        : i.productPrice().multiply(BigDecimal.valueOf(i.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new CartResponse(items, totalItems, totalPrice);
    }
}
