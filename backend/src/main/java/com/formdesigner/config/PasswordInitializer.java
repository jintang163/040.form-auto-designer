package com.formdesigner.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

@Slf4j
@Component
public class PasswordInitializer implements CommandLineRunner {

    private final DataSource dataSource;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public PasswordInitializer(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) {
        try (Connection conn = dataSource.getConnection()) {
            String[] users = {"admin", "hr_admin", "finance_admin", "procurement_admin"};
            String[] passwords = {"admin123", "admin123", "admin123", "admin123"};

            for (int i = 0; i < users.length; i++) {
                String hashed = passwordEncoder.encode(passwords[i]);
                try (PreparedStatement ps = conn.prepareStatement(
                        "UPDATE sys_user SET password_hash = ? WHERE user_id = ? AND is_deleted = 0")) {
                    ps.setString(1, hashed);
                    ps.setString(2, users[i]);
                    int updated = ps.executeUpdate();
                    if (updated > 0) {
                        log.info("Updated password hash for user: {}", users[i]);
                    }
                }
            }

            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT user_id, is_super_admin FROM sys_user WHERE is_deleted = 0")) {
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        log.info("Initialized user: {}, superAdmin={}", rs.getString(1), rs.getInt(2));
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Password initialization skipped (table may not exist yet): {}", e.getMessage());
        }
    }
}
