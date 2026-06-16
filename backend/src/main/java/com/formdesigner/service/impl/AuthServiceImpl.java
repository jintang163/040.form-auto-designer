package com.formdesigner.service.impl;

import com.formdesigner.common.TenantContext;
import com.formdesigner.dto.LoginRequestDTO;
import com.formdesigner.dto.LoginResponseDTO;
import com.formdesigner.entity.SysUser;
import com.formdesigner.entity.SysUserSession;
import com.formdesigner.entity.SysTenantUser;
import com.formdesigner.mapper.SysUserMapper;
import com.formdesigner.mapper.SysUserSessionMapper;
import com.formdesigner.mapper.SysTenantUserMapper;
import com.formdesigner.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final SysUserMapper sysUserMapper;
    private final SysUserSessionMapper sysUserSessionMapper;
    private final SysTenantUserMapper sysTenantUserMapper;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Override
    @Transactional
    public LoginResponseDTO login(LoginRequestDTO request, String loginIp, String userAgent) {
        SysUser user = sysUserMapper.selectByUserId(request.getUserId());
        if (user == null) {
            throw new IllegalArgumentException("账号或密码错误");
        }

        if (!"ACTIVE".equals(user.getStatus())) {
            throw new IllegalArgumentException("账号已被禁用");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            log.warn("Password mismatch for user: {}", request.getUserId());
            throw new IllegalArgumentException("账号或密码错误");
        }

        String sessionId = UUID.randomUUID().toString().replace("-", "");
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(24);

        SysUserSession session = new SysUserSession();
        session.setSessionId(sessionId);
        session.setUserId(user.getUserId());
        session.setLoginIp(loginIp);
        session.setUserAgent(userAgent);
        session.setExpiresAt(expiresAt);
        sysUserSessionMapper.insert(session);

        String role = (user.getIsSuperAdmin() != null && user.getIsSuperAdmin() == 1)
                ? TenantContext.SUPER_ADMIN
                : TenantContext.USER;

        List<SysTenantUser> tenantUsers = sysTenantUserMapper.selectByUserId(user.getUserId());
        if (!tenantUsers.isEmpty() && TenantContext.USER.equals(role)) {
            for (SysTenantUser tu : tenantUsers) {
                if (TenantContext.TENANT_ADMIN.equals(tu.getRole())) {
                    role = TenantContext.TENANT_ADMIN;
                    break;
                }
            }
        }

        LoginResponseDTO response = new LoginResponseDTO();
        response.setToken(sessionId);
        response.setUserId(user.getUserId());
        response.setUserName(user.getUserName());
        response.setRole(role);
        response.setEmail(user.getEmail());
        response.setAvatarUrl(user.getAvatarUrl());
        response.setTenants(tenantUsers);

        log.info("User logged in: {} (role: {}, ip: {})", user.getUserId(), role, loginIp);
        return response;
    }

    @Override
    public void logout(String token) {
        sysUserSessionMapper.deleteBySessionId(token);
    }

    @Override
    public boolean validateToken(String token) {
        if (token == null || token.isEmpty()) {
            return false;
        }
        SysUserSession session = sysUserSessionMapper.selectBySessionId(token);
        return session != null && session.getExpiresAt().isAfter(LocalDateTime.now());
    }

    @Override
    public String getUserIdFromToken(String token) {
        if (token == null || token.isEmpty()) {
            return null;
        }
        SysUserSession session = sysUserSessionMapper.selectBySessionId(token);
        return session != null ? session.getUserId() : null;
    }
}
