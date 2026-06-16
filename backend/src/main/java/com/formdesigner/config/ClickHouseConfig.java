package com.formdesigner.config;

import com.clickhouse.jdbc.ClickHouseDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.util.Properties;

@Configuration
public class ClickHouseConfig {

    @Value("${clickhouse.url}")
    private String url;

    @Value("${clickhouse.username}")
    private String username;

    @Value("${clickhouse.password:}")
    private String password;

    @Bean("clickhouseDataSource")
    public DataSource clickhouseDataSource() {
        Properties props = new Properties();
        props.setProperty("user", username);
        if (password != null) {
            props.setProperty("password", password);
        }
        return new ClickHouseDataSource(url, props);
    }

    @Bean("clickhouseJdbcTemplate")
    public JdbcTemplate clickhouseJdbcTemplate() {
        return new JdbcTemplate(clickhouseDataSource());
    }
}
