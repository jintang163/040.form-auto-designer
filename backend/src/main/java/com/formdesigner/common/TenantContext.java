package com.formdesigner.common;

public class TenantContext {

    private static final ThreadLocal<Long> TENANT_ID = new ThreadLocal<>();
    private static final ThreadLocal<String> USER_ROLE = new ThreadLocal<>();
    private static final ThreadLocal<String> USER_ID = new ThreadLocal<>();

    public static final String SUPER_ADMIN = "SUPER_ADMIN";
    public static final String TENANT_ADMIN = "TENANT_ADMIN";
    public static final String USER = "USER";

    public static void setTenantId(Long tenantId) {
        TENANT_ID.set(tenantId);
    }

    public static Long getTenantId() {
        return TENANT_ID.get();
    }

    public static void setUserRole(String role) {
        USER_ROLE.set(role);
    }

    public static String getUserRole() {
        return USER_ROLE.get();
    }

    public static void setUserId(String userId) {
        USER_ID.set(userId);
    }

    public static String getUserId() {
        return USER_ID.get();
    }

    public static boolean isSuperAdmin() {
        return SUPER_ADMIN.equals(USER_ROLE.get());
    }

    public static void clear() {
        TENANT_ID.remove();
        USER_ROLE.remove();
        USER_ID.remove();
    }
}
