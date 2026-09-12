package com.reinasleo.api.controller;

import com.reinasleo.api.exception.OutOfStockException;
import org.junit.jupiter.api.Test;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RestExceptionHandlerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private RestExceptionHandler handler;

    @Test
    void fileHeavierThanTheRequestCeiling_returns400WithOurWords_notSpringsDefault() {
        // Резолвер multipart отказывает ДО входа в контроллер, так что наш
        // текст про 8 МБ туда не доедет. Владелец обязан прочитать то же
        // самое: сколько влезает и куда нести тяжёлое.
        ResponseEntity<Map<String, Object>> response =
                handler.handleTooLarge(new MaxUploadSizeExceededException(64L * 1024 * 1024));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).containsEntry("error", "file_too_large");
        assertThat((String) response.getBody().get("message"))
                .contains("64 МБ")
                .contains("телеграм");
    }

    @Test
    void missingRequiredHeader_returns400_notGeneric500() throws Exception {
        // POST /api/bot/check-user without X-Bot-Secret header used to fall through
        // to the catch-all Exception handler and return 500 "Unexpected error".
        // It must now be a 400 with a clear "missing_header" error code.
        mockMvc.perform(post("/api/bot/check-user")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"telegramId\":1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("missing_header"))
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("X-Bot-Secret")));
    }

    @Test
    void malformedJsonBody_returns400() throws Exception {
        // POST /api/auth/login with broken JSON used to bubble up as 500.
        // It should be a 400 with the malformed_body error code.
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{not valid json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("malformed_body"));
    }

    @Test
    void outOfStockException_envelopeUsesErrorField_notCode() {
        ResponseEntity<Map<String, Object>> response =
                handler.handleOutOfStock(new OutOfStockException("prod-123", 3, 1));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        Map<String, Object> body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body).containsEntry("error", "out_of_stock");
        assertThat(body).doesNotContainKey("code");
        assertThat(body).containsEntry("productId", "prod-123");
        assertThat(body).containsEntry("requested", 3);
        assertThat(body).containsEntry("available", 1);
        assertThat(body.get("message")).isInstanceOf(String.class);
    }

    @Test
    void illegalArgumentException_messageIsStable_doesNotEchoInternalDetail() {
        ResponseEntity<Map<String, Object>> withMessage =
                handler.handleIllegalArgument(new IllegalArgumentException("Product not found: xyz"));

        assertThat(withMessage.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(withMessage.getBody()).isNotNull();
        assertThat(withMessage.getBody()).containsEntry("error", "bad_request");
        assertThat(withMessage.getBody()).containsEntry("message", "Bad request");

        ResponseEntity<Map<String, Object>> nullMessage =
                handler.handleIllegalArgument(new IllegalArgumentException((String) null));

        assertThat(nullMessage.getBody()).isNotNull();
        assertThat(nullMessage.getBody()).containsEntry("error", "bad_request");
        assertThat(nullMessage.getBody()).containsEntry("message", "Bad request");
    }

    @Test
    void aBrokenCheckConstraintIsA400_andLeaksNothingFromTheFailingRow() {
        // Сообщение PSQLException — это ServerErrorMessage.toString() вместе с
        // «Detail: Failing row contains (…)», то есть значениями всех колонок
        // отказавшей строки. Обработчик глобальный, CHECK'и есть на order_items и
        // payments, а чекаут и вебхук YooKassa открыты — отдать этот текст
        // наружу значит отдать чужие данные заказа.
        var checkViolation = new org.springframework.dao.DataIntegrityViolationException(
                "could not execute statement",
                new java.sql.SQLException(
                        "ERROR: new row for relation \"order_items\" violates check constraint \"ck_order_items_qty\"\n"
                                + "  Detail: Failing row contains (ord-77, ivan@example.com, +79990000000, 4, 19000).",
                        "23514"));

        ResponseEntity<Map<String, Object>> response = handler.handleDataIntegrity(checkViolation);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).containsEntry("error", "constraint_violation");
        assertThat(response.getBody()).containsEntry("constraint", "ck_order_items_qty");
        String out = String.valueOf(response.getBody());
        assertThat(out).contains("ck_order_items_qty");
        assertThat(out).doesNotContain("Failing row");
        assertThat(out).doesNotContain("ivan@example.com");
        assertThat(out).doesNotContain("+79990000000");
    }

    @Test
    void theCheckBranchIsChosenBySqlState_notByWordsInTheMessage() {
        // Прежняя версия искала подстроку «check constraint» — это зависело бы и
        // от драйвера, и от локали сервера. SQLSTATE стандартен: 23514 у
        // PostgreSQL, 23513 у H2. Проверяем на сообщении, в котором нужных слов
        // нет вовсе.
        for (String state : new String[]{"23514", "23513"}) {
            var violation = new org.springframework.dao.DataIntegrityViolationException(
                    "nope",
                    new java.sql.SQLException("нарушено правило \"ck_product_models_category\"", state));

            ResponseEntity<Map<String, Object>> response = handler.handleDataIntegrity(violation);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(response.getBody()).containsEntry("error", "constraint_violation");
            // Имя правила достаётся по-лучшему: не вышло — «unknown», и наружу
            // всё равно не уходит ни байта из сообщения драйвера.
            assertThat(String.valueOf(response.getBody())).doesNotContain("нарушено правило");
        }
    }

    @Test
    void aViolationWithoutSqlStateKeepsTheOldConflictAnswer() {
        // Не регрессируем на том, чего не знаем: без SQLSTATE ответ остаётся тем
        // же, что и до правки.
        var unknown = new org.springframework.dao.DataIntegrityViolationException(
                "nope", new java.sql.SQLException("что-то пошло не так"));

        ResponseEntity<Map<String, Object>> response = handler.handleDataIntegrity(unknown);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).containsEntry("message", "email_exists");
    }

    @Test
    void aUniqueViolationStillReadsAsTheEmailConflict() {
        var uniqueViolation = new org.springframework.dao.DataIntegrityViolationException(
                "could not execute statement",
                new java.sql.SQLException("duplicate key value violates unique constraint \"users_email_key\"", "23505"));

        ResponseEntity<Map<String, Object>> response = handler.handleDataIntegrity(uniqueViolation);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).containsEntry("message", "email_exists");
    }
}
