package com.reinasleo.api.service;

import com.reinasleo.api.client.CreatePaymentRequest;
import com.reinasleo.api.client.YooKassaAmount;
import com.reinasleo.api.client.YooKassaClient;
import com.reinasleo.api.client.YooKassaConfirmationRequest;
import com.reinasleo.api.client.YooKassaPaymentResponse;
import com.reinasleo.api.client.YooKassaReceipt;
import com.reinasleo.api.client.YooKassaReceiptCustomer;
import com.reinasleo.api.client.YooKassaReceiptItem;
import com.reinasleo.api.config.YooKassaProperties;
import com.reinasleo.api.dto.CheckoutAddressRequest;
import com.reinasleo.api.dto.CheckoutItemRequest;
import com.reinasleo.api.dto.CheckoutRequest;
import com.reinasleo.api.dto.CheckoutResponse;
import com.reinasleo.api.exception.BadRequestException;
import com.reinasleo.api.exception.CheckoutDisabledException;
import com.reinasleo.api.exception.NotFoundException;
import com.reinasleo.api.exception.OutOfStockException;
import com.reinasleo.api.client.YooKassaApiException;
import com.reinasleo.api.model.Order;
import com.reinasleo.api.model.OrderItem;
import com.reinasleo.api.model.OrderState;
import com.reinasleo.api.model.Payment;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.OrderRepository;
import com.reinasleo.api.repository.PaymentRepository;
import com.reinasleo.api.repository.ProductRepository;
import com.reinasleo.api.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * On-site checkout (Phase 2): валидация корзины против products (цена
 * ТОЛЬКО из БД), создание Order через state machine, создание платежа в
 * YooKassa с фискальным чеком 54-ФЗ.
 *
 * При ошибке YooKassa вся транзакция откатывается (order + stock decrement),
 * а не остаётся в PAYMENT_FAILED: payments.external_payment_id NOT NULL — без
 * успешного create нет payment row, а «висячий» заказ без платёжной попытки
 * никогда не получит webhook и навсегда заморозит сток.
 */
@Service
public class CheckoutService {

    private static final Logger log = LoggerFactory.getLogger(CheckoutService.class);

    static final String PROVIDER = "YOOKASSA";
    // chk_payments_status (V25): значения, которые может вернуть YooKassa на create.
    private static final Set<String> ALLOWED_PAYMENT_STATUSES =
            Set.of("pending", "waiting_for_capture", "succeeded", "canceled");
    private static final int MAX_DESCRIPTION_LENGTH = 128;

    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final OrderStateService orderStateService;
    private final YooKassaClient yooKassaClient;
    private final YooKassaProperties properties;

    public CheckoutService(ProductRepository productRepository,
                           OrderRepository orderRepository,
                           PaymentRepository paymentRepository,
                           UserRepository userRepository,
                           OrderStateService orderStateService,
                           YooKassaClient yooKassaClient,
                           YooKassaProperties properties) {
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
        this.orderStateService = orderStateService;
        this.yooKassaClient = yooKassaClient;
        this.properties = properties;
    }

    @Transactional
    public CheckoutResponse createOrder(CheckoutRequest request, User userOrNull) {
        if (!properties.enabled()) {
            throw new CheckoutDisabledException();
        }

        User user = resolveUser(request, userOrNull);

        // Row locks в детерминированном порядке — против deadlock'ов между
        // конкурентными checkout'ами с пересекающимися наборами товаров
        // (тот же паттерн что в OrderService.checkout).
        List<CheckoutItemRequest> sorted = request.items().stream()
                .sorted(Comparator.comparing(CheckoutItemRequest::productId))
                .toList();

        BigDecimal total = BigDecimal.ZERO;
        List<Product> lockedProducts = new ArrayList<>(sorted.size());
        for (CheckoutItemRequest item : sorted) {
            Product product = productRepository.findByIdForUpdate(item.productId())
                    .filter(Product::isActive)
                    .orElseThrow(() -> new NotFoundException("product_not_found"));

            validateSize(product, item.size());

            if (item.qty() > product.getStockQuantity()) {
                throw new OutOfStockException(product.getId(), item.qty(), product.getStockQuantity());
            }
            product.setStockQuantity(product.getStockQuantity() - item.qty());
            productRepository.save(product);
            lockedProducts.add(product);

            // Цена ТОЛЬКО из products — клиентская цена не принимается вообще
            // (её нет в DTO) и не может быть подменена.
            total = total.add(product.getPrice().multiply(BigDecimal.valueOf(item.qty())));
        }

        Order order = buildOrder(request, user, total);
        for (int i = 0; i < sorted.size(); i++) {
            CheckoutItemRequest item = sorted.get(i);
            Product product = lockedProducts.get(i);
            order.getItems().add(new OrderItem(order, product, item.size(), item.qty(), product.getPrice()));
        }
        orderRepository.save(order);
        orderStateService.transition(order, OrderState.AWAITING_PAYMENT);

        UUID idempotenceKey = UUID.randomUUID();
        YooKassaPaymentResponse created =
                yooKassaClient.createPayment(buildPaymentRequest(order, request.email()), idempotenceKey);

        String confirmationUrl = created.confirmation() == null ? null : created.confirmation().confirmationUrl();
        if (created.id() == null || created.id().isBlank() || confirmationUrl == null || confirmationUrl.isBlank()) {
            // Провайдер ответил 2xx, но без id / confirmation_url — платить нечем,
            // откатываем заказ целиком.
            throw new YooKassaApiException("YooKassa create response missing id or confirmation_url", 0);
        }

        Payment payment = new Payment(order, PROVIDER, created.id(), total, normalizeStatus(created.status()));
        payment.setMetadata(Map.of("idempotenceKey", idempotenceKey.toString()));
        paymentRepository.save(payment);

        order.setPaymentStatus(payment.getStatus());
        orderRepository.save(order);

        log.info("Checkout order {} created: payment {} status={} total={}",
                order.getId(), created.id(), payment.getStatus(), total);
        return new CheckoutResponse(order.getId(), confirmationUrl);
    }

    private User resolveUser(CheckoutRequest request, User userOrNull) {
        if (userOrNull != null) {
            return userOrNull;
        }
        // Guest checkout: users.email имеет partial-unique индекс — заказ
        // прикрепляется к существующему аккаунту с этим email, иначе создаётся
        // guest-строка (privacyAccepted=false: явного согласия чекаута нет).
        return userRepository.findByEmailIgnoreCase(request.email())
                .orElseGet(() -> userRepository.save(guestUser(request)));
    }

    private static User guestUser(CheckoutRequest request) {
        String name = request.name() == null || request.name().isBlank() ? "Гость" : request.name();
        return new User(request.email(), name, null, null, null, false, false);
    }

    private static void validateSize(Product product, String size) {
        String[] sizes = product.getSizes();
        if (sizes == null || sizes.length == 0) {
            return;
        }
        if (size == null || Arrays.stream(sizes).noneMatch(size::equals)) {
            throw new BadRequestException("invalid_size");
        }
    }

    private static Order buildOrder(CheckoutRequest request, User user, BigDecimal total) {
        Order order = new Order(user, total);
        // Начальное состояние DRAFT — это seed нового заказа, не transition;
        // все дальнейшие смены статуса идут через OrderStateService.
        order.setStatus(OrderState.DRAFT.toDbValue());
        order.setCustomerEmail(request.email());
        order.setCustomerPhone(request.phone());
        order.setCustomerName(request.name());
        order.setDeliveryAddress(addressSnapshot(request.deliveryAddress()));
        return order;
    }

    private static Map<String, Object> addressSnapshot(CheckoutAddressRequest address) {
        // Snapshot в orders.delivery_address JSONB (V24) — заказ исторический
        // документ, адрес не меняется при редактировании профиля.
        Map<String, Object> snapshot = new HashMap<>();
        snapshot.put("city", address.city());
        snapshot.put("street", address.street());
        snapshot.put("house", address.house());
        if (address.apartment() != null && !address.apartment().isBlank()) {
            snapshot.put("apartment", address.apartment());
        }
        if (address.comment() != null && !address.comment().isBlank()) {
            snapshot.put("comment", address.comment());
        }
        return snapshot;
    }

    private CreatePaymentRequest buildPaymentRequest(Order order, String customerEmail) {
        List<YooKassaReceiptItem> receiptItems = order.getItems().stream()
                .map(item -> YooKassaReceiptItem.commodity(
                        truncate(item.getProduct().getTitle()),
                        item.getQuantity(),
                        YooKassaAmount.rub(item.getPrice())))
                .toList();
        return new CreatePaymentRequest(
                YooKassaAmount.rub(order.getTotal()),
                true,
                YooKassaConfirmationRequest.redirect(
                        properties.returnUrlBase() + "/checkout/result?orderId=" + order.getId()),
                truncate("Заказ REINASLEO " + order.getId()),
                Map.of("orderId", order.getId().toString()),
                new YooKassaReceipt(new YooKassaReceiptCustomer(customerEmail), receiptItems));
    }

    private static String normalizeStatus(String status) {
        if (status != null && ALLOWED_PAYMENT_STATUSES.contains(status)) {
            return status;
        }
        log.warn("Unexpected YooKassa payment status on create: {}; storing as pending", status);
        return "pending";
    }

    private static String truncate(String s) {
        if (s == null) return "";
        return s.length() <= MAX_DESCRIPTION_LENGTH ? s : s.substring(0, MAX_DESCRIPTION_LENGTH);
    }
}
