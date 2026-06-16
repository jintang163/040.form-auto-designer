package com.formdesigner.config;

import com.formdesigner.common.TenantContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@Slf4j
@Component
public class TenantInterceptor implements HandlerInterceptor {

    private static final String HEADER_TENANT_ID = "X-Tenant-Id";
    private static final String HEADER_USER_ID = "X-User-Id";
    private static final String HEADER_USER_ROLE = "X-User-Role";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String tenantIdStr = request.getHeader(HEADER_TENANT_ID);
        String userId = request.getHeader(HEADER_USER_ID);
        String userRole = request.getHeader(HEADER_USER_ROLE);

        if (tenantIdStr != null && !tenantIdStr.isEmpty()) {
            try {
                TenantContext.setTenantId(Long.parseLong(tenantIdStr));
            } catch (NumberFormatException e) {
                log.warn("Invalid tenant id header: {}", tenantIdStr);
                TenantContext.setTenantId(1L);
            }
        } else {
            TenantContext.setTenantId(1L);
        }

        if (userId != null && !userId.isEmpty()) {
            TenantContext.setUserId(userId);
        }

        if (userRole != null && !userRole.isEmpty()) {
            TenantContext.setUserRole(userRole);
        } else {
            TenantContext.setUserRole(TenantContext.USER);
        }

        log.debug("TenantContext set: tenantId={}, userId={}, role={}",
                TenantContext.getTenantId(), TenantContext.getUserId(), TenantContext.getUserRole());

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        TenantContext.clear();
    }
}
