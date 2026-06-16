package com.formdesigner.config;

import com.formdesigner.common.TenantContext;
import com.formdesigner.entity.SysUser;
import com.formdesigner.entity.SysTenantUser;
import com.formdesigner.mapper.SysUserMapper;
import com.formdesigner.mapper.SysUserSessionMapper;
import com.formdesigner.mapper.SysTenantUserMapper;
import com.formdesigner.entity.SysUserSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class TenantInterceptor implements HandlerInterceptor {

    private static final String HEADER_TENANT_ID = "X-Tenant-Id";
    private static final String HEADER_AUTHORIZATION = "Authorization";

    private final SysUserMapper sysUserMapper;
    private final SysUserSessionMapper sysUserSessionMapper;
    private final SysTenantUserMapper sysTenantUserMapper;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String tenantIdStr = request.getHeader(HEADER_TENANT_ID);
        String authHeader = request.getHeader(HEADER_AUTHORIZATION);

        Long tenantId = 1L;
        if (tenantIdStr != null && !tenantIdStr.isEmpty()) {
            try {
                tenantId = Long.parseLong(tenantIdStr);
            } catch (NumberFormatException e) {
                log.warn("Invalid tenant id header: {}", tenantIdStr);
            }
        }
        TenantContext.setTenantId(tenantId);

        String token = extractToken(authHeader);
        if (token != null && !token.isEmpty()) {
            SysUserSession session = sysUserSessionMapper.selectBySessionId(token);
            if (session != null && session.getExpiresAt().isAfter(LocalDateTime.now())) {
                SysUser user = sysUserMapper.selectByUserId(session.getUserId());
                if (user != null && "ACTIVE".equals(user.getStatus())) {
                    TenantContext.setUserId(user.getUserId());

                    String role = TenantContext.USER;
                    if (user.getIsSuperAdmin() != null && user.getIsSuperAdmin() == 1) {
                        role = TenantContext.SUPER_ADMIN;
                    } else {
                        List<SysTenantUser> tenantUsers = sysTenantUserMapper.selectByUserId(user.getUserId());
                        for (SysTenantUser tu : tenantUsers) {
                            if (tu.getTenantId().equals(tenantId) && TenantContext.TENANT_ADMIN.equals(tu.getRole())) {
                                role = TenantContext.TENANT_ADMIN;
                                break;
                            }
                        }
                    }
                    TenantContext.setUserRole(role);

                    log.debug("Authenticated user: {} (role: {}, tenant: {})", user.getUserId(), role, tenantId);
                    return true;
                }
            }
            log.warn("Invalid or expired token for tenant: {}", tenantId);
        }

        TenantContext.setUserId("anonymous");
        TenantContext.setUserRole(TenantContext.USER);
        log.debug("Anonymous request for tenant: {}", tenantId);
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        TenantContext.clear();
    }

    private String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return authHeader;
    }
}
