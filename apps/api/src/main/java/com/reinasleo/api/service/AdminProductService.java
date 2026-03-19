package com.reinasleo.api.service;

import com.reinasleo.api.dto.*;
import com.reinasleo.api.model.Collection;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.StockAlert;
import com.reinasleo.api.repository.CollectionRepository;
import com.reinasleo.api.repository.ProductRepository;
import com.reinasleo.api.repository.StockAlertRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class AdminProductService {

    private final ProductRepository productRepository;
    private final CollectionRepository collectionRepository;
    private final StockAlertRepository stockAlertRepository;

    public AdminProductService(ProductRepository productRepository,
                               CollectionRepository collectionRepository,
                               StockAlertRepository stockAlertRepository) {
        this.productRepository = productRepository;
        this.collectionRepository = collectionRepository;
        this.stockAlertRepository = stockAlertRepository;
    }

    @Transactional(readOnly = true)
    public List<AdminProductResponse> listAll() {
        return productRepository.findAll().stream()
                .map(this::toAdminResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminProductResponse getById(String id) {
        Product p = productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        return toAdminResponse(p);
    }

    @CacheEvict(value = {"products", "collections", "homepage"}, allEntries = true)
    @Transactional
    public AdminProductResponse create(AdminProductRequest req) {
        if (req.id() == null || req.id().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product ID is required");
        }
        if (productRepository.existsById(req.id())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Product with this ID already exists");
        }

        Product p = new Product();
        applyFields(p, req);
        p.setId(req.id());
        p.setTest(false); // Products added via admin are real
        Product saved = productRepository.save(p);
        checkStockAlerts(saved);
        return toAdminResponse(saved);
    }

    @CacheEvict(value = {"products", "collections", "homepage"}, allEntries = true)
    @Transactional
    public AdminProductResponse update(String id, AdminProductRequest req) {
        Product p = productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        applyFields(p, req);
        Product saved = productRepository.save(p);
        checkStockAlerts(saved);
        return toAdminResponse(saved);
    }

    @CacheEvict(value = {"products", "collections", "homepage"}, allEntries = true)
    @Transactional
    public void deactivate(String id) {
        Product p = productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        p.setActive(false);
        productRepository.save(p);
    }

    @CacheEvict(value = {"products", "collections", "homepage"}, allEntries = true)
    @Transactional
    public AdminProductResponse updateStock(String id, int quantity) {
        Product p = productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        p.setStockQuantity(quantity);
        Product saved = productRepository.save(p);
        checkStockAlerts(saved);
        return toAdminResponse(saved);
    }

    @CacheEvict(value = {"products", "collections", "homepage"}, allEntries = true)
    @Transactional
    public void hardDelete(String id) {
        Product p = productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        productRepository.delete(p);
    }

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard() {
        long totalProducts = productRepository.countByActiveTrueAndIsTestFalse();
        long totalCollections = collectionRepository.findByActiveTrueOrderBySortOrderAsc().size();
        long outOfStock = productRepository.countByActiveTrueAndIsTestFalseAndStockQuantityEquals(0);
        long totalAlerts = stockAlertRepository.findByAcknowledgedFalseOrderByCreatedAtDesc().size();
        // Low stock: stock > 0 and stock <= 5 (default threshold), only real products
        long lowStock = productRepository.countByActiveTrueAndIsTestFalseAndStockQuantityGreaterThanAndStockQuantityLessThanEqual(0, 5);
        return new DashboardResponse(totalProducts, totalCollections, lowStock, outOfStock, totalAlerts);
    }

    @Transactional(readOnly = true)
    public List<StockAlertResponse> getAlerts() {
        return stockAlertRepository.findByAcknowledgedFalseOrderByCreatedAtDesc().stream()
                .map(alert -> {
                    Product p = productRepository.findById(alert.getProductId()).orElse(null);
                    return new StockAlertResponse(
                            alert.getId(),
                            alert.getProductId(),
                            p != null ? p.getTitle() : "Unknown",
                            alert.getAlertType(),
                            p != null ? p.getStockQuantity() : 0,
                            alert.getCreatedAt()
                    );
                })
                .toList();
    }

    @Transactional
    public void acknowledgeAlert(java.util.UUID alertId) {
        StockAlert alert = stockAlertRepository.findById(alertId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Alert not found"));
        alert.setAcknowledged(true);
        stockAlertRepository.save(alert);
    }

    private void checkStockAlerts(Product p) {
        if (p.isTest()) return;

        if (p.getStockQuantity() == 0) {
            if (!stockAlertRepository.existsByProductIdAndAlertTypeAndAcknowledgedFalse(p.getId(), "out_of_stock")) {
                stockAlertRepository.save(new StockAlert(p.getId(), "out_of_stock"));
            }
        } else if (p.getStockQuantity() <= p.getLowStockThreshold()) {
            if (!stockAlertRepository.existsByProductIdAndAlertTypeAndAcknowledgedFalse(p.getId(), "low_stock")) {
                stockAlertRepository.save(new StockAlert(p.getId(), "low_stock"));
            }
        }
    }

    private void applyFields(Product p, AdminProductRequest req) {
        p.setTitle(req.title());
        p.setDescription(req.description());
        p.setPrice(req.price());
        p.setCategory(req.category());
        p.setSizes(req.sizes());
        p.setCollectionId(req.collectionId());
        p.setStockQuantity(req.stockQuantity());
        p.setLowStockThreshold(req.lowStockThreshold() > 0 ? req.lowStockThreshold() : 5);
        p.setActive(req.active());
        p.setOccasion(req.occasion());
        p.setColor(req.color());
        p.setMaterial(req.material());
        p.setSubtitle(req.subtitle());
        p.setSku(req.sku());
        if (req.images() != null) {
            p.setImages(req.images());
        }
    }

    private AdminProductResponse toAdminResponse(Product p) {
        String collectionName = null;
        if (p.getCollectionId() != null) {
            collectionName = collectionRepository.findById(p.getCollectionId())
                    .map(Collection::getName).orElse(null);
        }
        return new AdminProductResponse(
                p.getId(), p.getTitle(), p.getDescription(), p.getPrice(),
                p.getImage(), p.getCategory(), p.getSizes(),
                p.getCollectionId(), collectionName,
                p.getStockQuantity(), p.getLowStockThreshold(),
                p.isTest(), p.isActive(),
                p.getOccasion(), p.getColor(), p.getMaterial(),
                p.getSubtitle(), p.getSku(), p.getImages(),
                p.getCreatedAt(), p.getUpdatedAt()
        );
    }
}
