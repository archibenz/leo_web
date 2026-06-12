package com.reinasleo.api.service;

import com.reinasleo.api.dto.ProductAlertResponse;
import com.reinasleo.api.event.BackInStockEvent;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.ProductStockAlert;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.ProductRepository;
import com.reinasleo.api.repository.ProductStockAlertRepository;
import com.reinasleo.api.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class ProductStockAlertService {

    private final ProductStockAlertRepository alertRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final TelegramNotifier telegramNotifier;

    @Value("${app.public-base-url:https://reinasleo.com}")
    private String publicBaseUrl;

    public ProductStockAlertService(ProductStockAlertRepository alertRepository,
                                    ProductRepository productRepository,
                                    UserRepository userRepository,
                                    TelegramNotifier telegramNotifier) {
        this.alertRepository = alertRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.telegramNotifier = telegramNotifier;
    }

    @Transactional
    public ProductAlertResponse subscribe(User user, String productId) {
        productRepository.findById(productId)
                .filter(Product::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        if (!alertRepository.existsByUserIdAndProductId(user.getId(), productId)) {
            alertRepository.save(new ProductStockAlert(user.getId(), productId));
        }
        return new ProductAlertResponse(productId, true, user.getTelegramId() != null);
    }

    @Transactional
    public void unsubscribe(User user, String productId) {
        alertRepository.deleteByUserIdAndProductId(user.getId(), productId);
    }

    @Transactional(readOnly = true)
    public List<String> listProductIds(User user) {
        return alertRepository.findByUserId(user.getId()).stream()
                .map(ProductStockAlert::getProductId)
                .toList();
    }

    // AFTER_COMMIT listener по умолчанию не получает write-транзакцию —
    // REQUIRES_NEW нужен, чтобы deleteByProductId реально закоммитился.
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onBackInStock(BackInStockEvent event) {
        List<ProductStockAlert> alerts = alertRepository.findByProductId(event.productId());
        if (alerts.isEmpty()) {
            return;
        }
        String productUrl = publicBaseUrl + "/ru/product/" + event.productId();
        for (ProductStockAlert alert : alerts) {
            userRepository.findActiveById(alert.getUserId())
                    .map(User::getTelegramId)
                    .ifPresent(telegramId -> telegramNotifier.sendBackInStock(
                            telegramId, event.productTitle(), productUrl));
        }
        alertRepository.deleteByProductId(event.productId());
    }
}
