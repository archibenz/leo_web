package com.reinasleo.api.service;

import com.reinasleo.api.client.CreatePaymentRequest;
import com.reinasleo.api.client.YooKassaAmount;
import com.reinasleo.api.client.YooKassaApiException;
import com.reinasleo.api.client.YooKassaClient;
import com.reinasleo.api.client.YooKassaConfirmationResponse;
import com.reinasleo.api.client.YooKassaPaymentResponse;
import com.reinasleo.api.config.YooKassaProperties;
import com.reinasleo.api.dto.CheckoutAddressRequest;
import com.reinasleo.api.dto.CheckoutItemRequest;
import com.reinasleo.api.dto.CheckoutRequest;
import com.reinasleo.api.dto.CheckoutResponse;
import com.reinasleo.api.exception.BadRequestException;
import com.reinasleo.api.exception.CheckoutDisabledException;
import com.reinasleo.api.exception.NotFoundException;
import com.reinasleo.api.exception.OutOfStockException;
import com.reinasleo.api.model.Order;
import com.reinasleo.api.model.OrderState;
import com.reinasleo.api.model.Payment;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.OrderRepository;
import com.reinasleo.api.repository.PaymentRepository;
import com.reinasleo.api.repository.ProductRepository;
import com.reinasleo.api.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CheckoutServiceTest {

    @Mock private ProductRepository productRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private UserRepository userRepository;
    @Mock private OrderStateService orderStateService;
    @Mock private YooKassaClient yooKassaClient;

    private CheckoutService service;
    private Product product;

    private static final YooKassaProperties ENABLED_PROPS =
            new YooKassaProperties("test-shop", "test-secret", true, "https://reinasleo.com");

    @BeforeEach
    void setUp() {
        service = newService(ENABLED_PROPS);

        product = new Product();
        product.setId("prod-1");
        product.setTitle("Silk dress");
        product.setPrice(new BigDecimal("2500.00"));
        product.setStockQuantity(10);
        product.setActive(true);
        product.setSizes(new String[]{"S", "M"});

        lenient().when(productRepository.findByIdForUpdate("prod-1")).thenReturn(Optional.of(product));
        lenient().when(userRepository.findByEmailIgnoreCase(any())).thenReturn(Optional.empty());
        lenient().when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        // JPA присваивает UUID при persist — эмулируем, иначе metadata {orderId} NPE.
        lenient().when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
            Order order = inv.getArgument(0);
            if (order.getId() == null) {
                ReflectionTestUtils.setField(order, "id", UUID.randomUUID());
            }
            return order;
        });
        lenient().when(orderStateService.transition(any(Order.class), any(OrderState.class))).thenAnswer(inv -> {
            Order order = inv.getArgument(0);
            order.setStatus(((OrderState) inv.getArgument(1)).toDbValue());
            return order;
        });
        lenient().when(yooKassaClient.createPayment(any(CreatePaymentRequest.class), any(UUID.class)))
                .thenReturn(paymentResponse("pending"));
    }

    private CheckoutService newService(YooKassaProperties props) {
        return new CheckoutService(productRepository, orderRepository, paymentRepository,
                userRepository, orderStateService, yooKassaClient, props);
    }

    private static YooKassaPaymentResponse paymentResponse(String status) {
        return new YooKassaPaymentResponse("yk-123", status, false,
                new YooKassaAmount("5000.00", "RUB"),
                new YooKassaConfirmationResponse("redirect", "https://yookassa.ru/confirm/yk-123"),
                null, Map.of());
    }

    private static CheckoutRequest request() {
        return new CheckoutRequest(
                List.of(new CheckoutItemRequest("prod-1", "M", 2)),
                "buyer@example.com",
                "+79991234567",
                "Anna",
                new CheckoutAddressRequest("Москва", "Тверская", "1", "12", null));
    }

    // ----- Happy path -----

    @Test
    void createOrder_guestHappyPath_returnsConfirmationUrl() {
        CheckoutResponse response = service.createOrder(request(), null);

        assertThat(response.orderId()).isNotNull();
        assertThat(response.confirmationUrl()).isEqualTo("https://yookassa.ru/confirm/yk-123");
    }

    @Test
    void createOrder_orderGoesThroughStateMachine_draftThenAwaitingPayment() {
        service.createOrder(request(), null);

        ArgumentCaptor<Order> orderCaptor = ArgumentCaptor.forClass(Order.class);
        verify(orderStateService).transition(orderCaptor.capture(), eq(OrderState.AWAITING_PAYMENT));
        Order order = orderCaptor.getValue();
        assertThat(order.getStatus()).isEqualTo("awaiting_payment");
        assertThat(order.getCustomerEmail()).isEqualTo("buyer@example.com");
        assertThat(order.getCustomerPhone()).isEqualTo("+79991234567");
        assertThat(order.getDeliveryAddress())
                .containsEntry("city", "Москва")
                .containsEntry("street", "Тверская")
                .containsEntry("house", "1")
                .containsEntry("apartment", "12")
                .doesNotContainKey("comment");
        assertThat(order.getPaymentStatus()).isEqualTo("pending");
    }

    @Test
    void createOrder_priceReadFromDb_neverFromClient() {
        // В CheckoutRequest вообще нет поля цены — единственный источник
        // это products.price. 2 × 2500.00 (из БД) = 5000.00.
        service.createOrder(request(), null);

        ArgumentCaptor<CreatePaymentRequest> captor = ArgumentCaptor.forClass(CreatePaymentRequest.class);
        verify(yooKassaClient).createPayment(captor.capture(), any(UUID.class));
        CreatePaymentRequest sent = captor.getValue();

        assertThat(sent.amount().value()).isEqualTo("5000.00");
        assertThat(sent.amount().currency()).isEqualTo("RUB");
        assertThat(sent.capture()).isTrue();
        assertThat(sent.confirmation().type()).isEqualTo("redirect");
        assertThat(sent.confirmation().returnUrl()).startsWith("https://reinasleo.com/checkout/result?orderId=");
        assertThat(sent.receipt().customer().email()).isEqualTo("buyer@example.com");
        assertThat(sent.receipt().items()).hasSize(1);
        var receiptItem = sent.receipt().items().get(0);
        assertThat(receiptItem.description()).isEqualTo("Silk dress");
        assertThat(receiptItem.quantity()).isEqualTo("2.00");
        assertThat(receiptItem.amount().value()).isEqualTo("2500.00");
        assertThat(receiptItem.vatCode()).isEqualTo(1);
        assertThat(receiptItem.paymentSubject()).isEqualTo("commodity");
        assertThat(receiptItem.paymentMode()).isEqualTo("full_payment");
    }

    @Test
    void createOrder_persistsPaymentRowWithExternalId() {
        service.createOrder(request(), null);

        ArgumentCaptor<Payment> captor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(captor.capture());
        Payment payment = captor.getValue();
        assertThat(payment.getProvider()).isEqualTo("YOOKASSA");
        assertThat(payment.getExternalPaymentId()).isEqualTo("yk-123");
        assertThat(payment.getStatus()).isEqualTo("pending");
        assertThat(payment.getAmount()).isEqualByComparingTo("5000.00");
        assertThat(payment.getMetadata()).containsKey("idempotenceKey");
    }

    @Test
    void createOrder_decrementsStock() {
        service.createOrder(request(), null);

        assertThat(product.getStockQuantity()).isEqualTo(8);
        verify(productRepository).save(product);
    }

    @Test
    void createOrder_orderItemsPricedFromDb() {
        service.createOrder(request(), null);

        ArgumentCaptor<Order> captor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository, org.mockito.Mockito.atLeastOnce()).save(captor.capture());
        Order order = captor.getValue();
        assertThat(order.getTotal()).isEqualByComparingTo("5000.00");
        assertThat(order.getItems()).hasSize(1);
        assertThat(order.getItems().get(0).getPrice()).isEqualByComparingTo("2500.00");
        assertThat(order.getItems().get(0).getQuantity()).isEqualTo(2);
    }

    // ----- User resolution -----

    @Test
    void createOrder_authenticatedUser_skipsEmailLookup() {
        User user = new User("member@example.com", "Member", null, "hash", null, false, true);

        service.createOrder(request(), user);

        verifyNoInteractions(userRepository);
        ArgumentCaptor<Order> captor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository, org.mockito.Mockito.atLeastOnce()).save(captor.capture());
        assertThat(captor.getValue().getUser()).isSameAs(user);
    }

    @Test
    void createOrder_guestWithExistingEmail_reusesUser() {
        User existing = new User("buyer@example.com", "Anna", null, "hash", null, false, true);
        when(userRepository.findByEmailIgnoreCase("buyer@example.com")).thenReturn(Optional.of(existing));

        service.createOrder(request(), null);

        verify(userRepository, never()).save(any(User.class));
        ArgumentCaptor<Order> captor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository, org.mockito.Mockito.atLeastOnce()).save(captor.capture());
        assertThat(captor.getValue().getUser()).isSameAs(existing);
    }

    @Test
    void createOrder_guestWithNewEmail_createsGuestUser() {
        service.createOrder(request(), null);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getEmail()).isEqualTo("buyer@example.com");
        assertThat(captor.getValue().getName()).isEqualTo("Anna");
    }

    // ----- Validation failures -----

    @Test
    void createOrder_outOfStock_throwsBeforeYooKassa() {
        CheckoutRequest request = new CheckoutRequest(
                List.of(new CheckoutItemRequest("prod-1", "M", 20)),
                "buyer@example.com", "+79991234567", "Anna",
                new CheckoutAddressRequest("Москва", "Тверская", "1", null, null));

        assertThatThrownBy(() -> service.createOrder(request, null))
                .isInstanceOf(OutOfStockException.class);

        verifyNoInteractions(yooKassaClient);
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void createOrder_unknownSize_throwsBadRequest() {
        CheckoutRequest request = new CheckoutRequest(
                List.of(new CheckoutItemRequest("prod-1", "XXL", 1)),
                "buyer@example.com", "+79991234567", "Anna",
                new CheckoutAddressRequest("Москва", "Тверская", "1", null, null));

        assertThatThrownBy(() -> service.createOrder(request, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("invalid_size");
        verifyNoInteractions(yooKassaClient);
    }

    @Test
    void createOrder_inactiveProduct_throwsNotFound() {
        product.setActive(false);

        assertThatThrownBy(() -> service.createOrder(request(), null))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("product_not_found");
        verifyNoInteractions(yooKassaClient);
    }

    // ----- Feature flag -----

    @Test
    void createOrder_checkoutDisabled_throws503Exception() {
        CheckoutService disabled = newService(
                new YooKassaProperties("test-shop", "test-secret", false, "https://reinasleo.com"));

        assertThatThrownBy(() -> disabled.createOrder(request(), null))
                .isInstanceOf(CheckoutDisabledException.class);

        verifyNoInteractions(productRepository, orderRepository, paymentRepository, userRepository,
                orderStateService, yooKassaClient);
    }

    // ----- YooKassa failure: транзакция откатывается целиком -----

    @Test
    void createOrder_yooKassaFailure_propagatesAndNoPaymentRow() {
        when(yooKassaClient.createPayment(any(CreatePaymentRequest.class), any(UUID.class)))
                .thenThrow(new YooKassaApiException("YooKassa createPayment failed with status 500", 500));

        assertThatThrownBy(() -> service.createOrder(request(), null))
                .isInstanceOf(YooKassaApiException.class);

        // Exception выходит из @Transactional → rollback (order + stock decrement).
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void createOrder_yooKassaResponseWithoutConfirmationUrl_throws() {
        when(yooKassaClient.createPayment(any(CreatePaymentRequest.class), any(UUID.class)))
                .thenReturn(new YooKassaPaymentResponse("yk-123", "pending", false,
                        new YooKassaAmount("5000.00", "RUB"), null, null, Map.of()));

        assertThatThrownBy(() -> service.createOrder(request(), null))
                .isInstanceOf(YooKassaApiException.class);
        verify(paymentRepository, never()).save(any());
    }
}
