package com.reinasleo.api.health;

import org.springframework.boot.actuate.health.AbstractHealthIndicator;
import org.springframework.boot.actuate.health.Health;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

@Component("database")
public class DatabaseHealthIndicator extends AbstractHealthIndicator {

    private final DataSource dataSource;

    public DatabaseHealthIndicator(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    protected void doHealthCheck(Health.Builder builder) throws Exception {
        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement();
             ResultSet rs = statement.executeQuery("SELECT 1")) {
            if (rs.next() && rs.getInt(1) == 1) {
                builder.up()
                        .withDetail("database", connection.getMetaData().getDatabaseProductName())
                        .withDetail("validationQuery", "SELECT 1");
            } else {
                builder.down().withDetail("reason", "SELECT 1 returned no result");
            }
        }
    }
}
