package com.formdesigner.config;

import com.clickhouse.jdbc.ClickHouseDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.util.Properties;

@Slf4j
@Configuration
@ConditionalOnClass(ClickHouseDataSource.class)
@ConditionalOnProperty(name = "clickhouse.enabled", havingValue = "true", matchIfMissing = true)
public class ClickHouseConfig {

    @Value("${clickhouse.url}")
    private String url;

    @Value("${clickhouse.username}")
    private String username;

    @Value("${clickhouse.password:}")
    private String password;

    @Value("${clickhouse.timeout-ms:5000}")
    private int timeoutMs;

    @Bean("clickhouseDataSource")
    public DataSource clickhouseDataSource() {
        Properties props = new Properties();
        props.setProperty("user", username);
        if (password != null && !password.isEmpty()) {
            props.setProperty("password", password);
        }
        props.setProperty("socket_timeout", String.valueOf(timeoutMs));
        props.setProperty("connect_timeout", String.valueOf(timeoutMs));
        return new ClickHouseDataSource(url, props);
    }

    @Bean("clickhouseJdbcTemplate")
    public JdbcTemplate clickhouseJdbcTemplate() {
        JdbcTemplate jdbcTemplate = new JdbcTemplate(clickhouseDataSource());
        jdbcTemplate.setQueryTimeout(timeoutMs / 1000);
        return jdbcTemplate;
    }
}
