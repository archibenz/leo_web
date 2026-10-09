package com.reinasleo.api.repository;

import com.reinasleo.api.dto.BotTelegramLinkConfirmRequest;
import com.reinasleo.api.exception.ConflictException;
import com.reinasleo.api.security.SiteSessionClaims.Session;
import com.reinasleo.api.service.TelegramIdentityService;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import static org.assertj.core.api.Assertions.*;

@EnabledIfEnvironmentVariable(named = "SITE_TELEGRAM_POSTGRES_QA", matches = "1")
class TelegramIdentityPostgresTest {
    private static final String CONTAINER = "site-telegram-identity-qa-" + UUID.randomUUID();
    private static String docker;
    private static JdbcTemplate jdbc;
    private static TransactionTemplate transaction;
    private static TelegramIdentityStore store;
    private static TelegramIdentityService identities;

    @BeforeAll
    static void startIsolatedPostgres14() throws Exception {
        docker = System.getenv().getOrDefault("SITE_TELEGRAM_DOCKER", "docker");
        command(docker, "run", "--rm", "-d", "--name", CONTAINER,
                "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "-p", "127.0.0.1::5432", "postgres:14-alpine");
        String address = command(docker, "port", CONTAINER, "5432/tcp").trim();
        int port = Integer.parseInt(address.substring(address.lastIndexOf(':') + 1));
        String url = "jdbc:postgresql://127.0.0.1:" + port + "/postgres";
        boolean ready = false;
        for (int attempt = 0; attempt < 50; attempt++) {
            try (Connection ignored = DriverManager.getConnection(url, "postgres", "")) {
                ready = true;
                break;
            } catch (java.sql.SQLException exception) {
                Thread.sleep(100);
            }
        }
        assertThat(ready).as("isolated PostgreSQL container is ready").isTrue();
        var dataSource = new DriverManagerDataSource(url, "postgres", "");
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        assertThat(jdbc.queryForObject("SHOW server_version", String.class)).startsWith("14.");
        transaction = new TransactionTemplate(new DataSourceTransactionManager(dataSource));
        store = new TelegramIdentityStore(jdbc);
        identities = new TelegramIdentityService(store, "test_bot", Clock.systemUTC());
    }

    @AfterAll
    static void removeOwnedContainer() throws Exception {
        if (docker != null) command(docker, "rm", "-f", CONTAINER);
    }

    private static String command(String... arguments) throws Exception {
        Process process = new ProcessBuilder(arguments).redirectErrorStream(true).start();
        if (!process.waitFor(30, TimeUnit.SECONDS)) {
            process.destroyForcibly();
            throw new IllegalStateException("Synthetic Docker operation timed out");
        }
        String output = new String(process.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
        assertThat(process.exitValue()).as(output).isZero();
        return output;
    }

    private static UUID account() {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO users (id, email, name, password_hash, role)
                VALUES (?, ?, 'Synthetic', 'synthetic-test-hash', 'admin')
                """, id, id + "@postgres-identity.test");
        return id;
    }

    private static Session session(UUID id) {
        return new Session(id, Instant.now().plusSeconds(3600));
    }

    private static String challenge(UUID id) {
        return transaction.execute(status -> identities.issue(session(id)).challengeToken());
    }

    private static void confirm(String token, long sender) {
        transaction.executeWithoutResult(status ->
                identities.confirm(new BotTelegramLinkConfirmRequest(token, sender, "synthetic_admin")));
    }

    @Test
    void realMigrationProtectsImmutableProofAndErasesItOnSoftDelete() {
        UUID id = account();
        confirm(challenge(id), 93000001L);
        assertThatThrownBy(() -> jdbc.update("""
                UPDATE verified_telegram_identities SET telegram_id = 93000002 WHERE user_id = ?
                """, id)).isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update("""
                UPDATE verified_telegram_identities SET user_id = ? WHERE user_id = ?
                """, account(), id)).isInstanceOf(DataIntegrityViolationException.class);
        assertThat(jdbc.queryForObject("SELECT telegram_id FROM verified_telegram_identities WHERE user_id = ?",
                Long.class, id)).isEqualTo(93000001L);
        challenge(id);
        jdbc.update("UPDATE users SET deleted_at = now(), telegram_id = NULL WHERE id = ?", id);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM verified_telegram_identities WHERE user_id = ?",
                Integer.class, id)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM telegram_link_challenges WHERE user_id = ?",
                Integer.class, id)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE id = ?", Integer.class, id)).isEqualTo(1);
    }

    @Test
    void concurrentReplayHasExactlyOneSuccessfulConsumption() throws Exception {
        UUID id = account();
        String token = challenge(id);
        CountDownLatch go = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(8)) {
            var tasks = new java.util.ArrayList<java.util.concurrent.Future<Boolean>>();
            for (int index = 0; index < 8; index++) {
                tasks.add(executor.submit(() -> {
                    go.await();
                    try {
                        confirm(token, 93000101L);
                        return true;
                    } catch (ResponseStatusException exception) {
                        assertThat(exception.getStatusCode().value()).isEqualTo(410);
                        return false;
                    }
                }));
            }
            go.countDown();
            long successes = 0;
            for (var task : tasks) if (task.get(10, TimeUnit.SECONDS)) successes++;
            assertThat(successes).isEqualTo(1);
        }
        assertThat(jdbc.queryForObject("""
                SELECT COUNT(*) FROM telegram_link_challenges WHERE user_id = ? AND consumed_at IS NOT NULL
                """, Integer.class, id)).isEqualTo(1);
    }

    @Test
    void issuanceAndConfirmationUseTheSameUserFirstLockOrder() throws Exception {
        UUID id = account();
        String oldToken = challenge(id);
        CountDownLatch userHeld = new CountDownLatch(1);
        CountDownLatch confirmationLookedUp = new CountDownLatch(1);
        var orderedStore = new TelegramIdentityStore(jdbc) {
            @Override
            public Optional<Account> activeAccount(UUID userId, boolean lock) {
                if (Thread.currentThread().getName().equals("identity-confirmer")) {
                    confirmationLookedUp.countDown();
                }
                var result = super.activeAccount(userId, lock);
                if (Thread.currentThread().getName().equals("identity-issuer")) {
                    userHeld.countDown();
                    try {
                        if (!confirmationLookedUp.await(5, TimeUnit.SECONDS)) {
                            throw new IllegalStateException("Confirmation did not reach the account lock");
                        }
                    } catch (InterruptedException exception) {
                        Thread.currentThread().interrupt();
                        throw new IllegalStateException(exception);
                    }
                }
                return result;
            }

        };
        var ordered = new TelegramIdentityService(orderedStore, "test_bot", Clock.systemUTC());
        try (var executor = Executors.newFixedThreadPool(2)) {
            var issuer = executor.submit(() -> {
                Thread.currentThread().setName("identity-issuer");
                return transaction.execute(status -> ordered.issue(session(id)));
            });
            assertThat(userHeld.await(5, TimeUnit.SECONDS)).isTrue();
            var confirmer = executor.submit(() -> {
                Thread.currentThread().setName("identity-confirmer");
                return catchThrowable(() -> transaction.executeWithoutResult(status ->
                        ordered.confirm(new BotTelegramLinkConfirmRequest(oldToken, 93000201L, null))));
            });
            assertThat(issuer.get(10, TimeUnit.SECONDS)).isNotNull();
            assertThat(confirmer.get(10, TimeUnit.SECONDS)).isInstanceOf(ResponseStatusException.class);
        }
        assertThat(jdbc.queryForObject("""
                SELECT COUNT(*) FROM telegram_link_challenges WHERE user_id = ? AND consumed_at IS NULL
                """, Integer.class, id)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT telegram_id FROM users WHERE id = ?", Long.class, id)).isNull();
    }

    @Test
    void concurrentDifferentUsersCannotOwnTheSameTelegramId() throws Exception {
        UUID first = account();
        UUID second = account();
        String firstToken = challenge(first);
        String secondToken = challenge(second);
        CountDownLatch bothChecked = new CountDownLatch(2);
        var racingStore = new TelegramIdentityStore(jdbc) {
            @Override
            public boolean ownedByAnother(UUID userId, long telegramId) {
                boolean result = super.ownedByAnother(userId, telegramId);
                bothChecked.countDown();
                try {
                    if (!bothChecked.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Race did not arrive");
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException(exception);
                }
                return result;
            }
        };
        var racing = new TelegramIdentityService(racingStore, "test_bot", Clock.systemUTC());
        try (var executor = Executors.newFixedThreadPool(2)) {
            var a = executor.submit(() -> catchThrowable(() -> transaction.executeWithoutResult(status ->
                    racing.confirm(new BotTelegramLinkConfirmRequest(firstToken, 93000301L, null)))));
            var b = executor.submit(() -> catchThrowable(() -> transaction.executeWithoutResult(status ->
                    racing.confirm(new BotTelegramLinkConfirmRequest(secondToken, 93000301L, null)))));
            var results = java.util.Arrays.asList(a.get(10, TimeUnit.SECONDS), b.get(10, TimeUnit.SECONDS));
            assertThat(results.stream().filter(java.util.Objects::isNull).count()).isEqualTo(1);
            assertThat(results.stream().filter(java.util.Objects::nonNull).findFirst().orElseThrow())
                    .isInstanceOf(ConflictException.class);
        }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE telegram_id = 93000301", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("""
                SELECT COUNT(*) FROM verified_telegram_identities WHERE telegram_id = 93000301
                """, Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("""
                SELECT COUNT(*) FROM telegram_link_challenges WHERE user_id IN (?, ?) AND consumed_at IS NULL
                """, Integer.class, first, second)).isEqualTo(1);
    }
}
