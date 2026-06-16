package com.formdesigner.controller;

import com.formdesigner.common.R;
import com.formdesigner.common.TenantContext;
import com.formdesigner.dto.TenantCreateDTO;
import com.formdesigner.dto.TenantQuotaUpdateDTO;
import com.formdesigner.dto.TenantUpdateDTO;
import com.formdesigner.entity.SysTenant;
import com.formdesigner.entity.SysTenantQuota;
import com.formdesigner.entity.SysTenantUser;
import com.formdesigner.service.SysTenantService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/tenants")
@RequiredArgsConstructor
public class SysTenantController {

    private final SysTenantService tenantService;

    @PostMapping
    public R<SysTenant> create(@Valid @RequestBody TenantCreateDTO dto) {
        assertSuperAdmin();
        return R.ok(tenantService.createTenant(dto));
    }

    @PutMapping("/{id}")
    public R<SysTenant> update(@PathVariable Long id, @RequestBody TenantUpdateDTO dto) {
        assertSuperAdminOrTenantAdmin(id);
        return R.ok(tenantService.updateTenant(id, dto));
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        assertSuperAdmin();
        tenantService.deleteTenant(id);
        return R.ok();
    }

    @GetMapping("/{id}")
    public R<SysTenant> getById(@PathVariable Long id) {
        return R.ok(tenantService.getById(id));
    }

    @GetMapping
    public R<List<SysTenant>> list() {
        if (TenantContext.isSuperAdmin()) {
            return R.ok(tenantService.listAll());
        }
        Long tenantId = TenantContext.getTenantId();
        if (tenantId != null) {
            SysTenant tenant = tenantService.getById(tenantId);
            return R.ok(tenant != null ? List.of(tenant) : List.of());
        }
        return R.ok(List.of());
    }

    @GetMapping("/active")
    public R<List<SysTenant>> listActive() {
        return R.ok(tenantService.listByStatus("ACTIVE"));
    }

    @GetMapping("/{id}/quota")
    public R<SysTenantQuota> getQuota(@PathVariable Long id) {
        return R.ok(tenantService.getQuotaByTenantId(id));
    }

    @PutMapping("/{id}/quota")
    public R<SysTenantQuota> updateQuota(@PathVariable Long id, @RequestBody TenantQuotaUpdateDTO dto) {
        assertSuperAdmin();
        return R.ok(tenantService.updateQuota(id, dto));
    }

    @GetMapping("/{id}/users")
    public R<List<SysTenantUser>> getTenantUsers(@PathVariable Long id) {
        return R.ok(tenantService.getTenantUsers(id));
    }

    @PostMapping("/{id}/users")
    public R<SysTenantUser> addUser(@PathVariable Long id,
                                     @RequestParam String userId,
                                     @RequestParam String userName,
                                     @RequestParam(defaultValue = "USER") String role) {
        assertSuperAdminOrTenantAdmin(id);
        return R.ok(tenantService.addUserToTenant(id, userId, userName, role));
    }

    @DeleteMapping("/{id}/users/{userId}")
    public R<Void> removeUser(@PathVariable Long id, @PathVariable String userId) {
        assertSuperAdminOrTenantAdmin(id);
        tenantService.removeUserFromTenant(id, userId);
        return R.ok();
    }

    @GetMapping("/current/user-tenants")
    public R<List<SysTenantUser>> getCurrentUserTenants() {
        String userId = TenantContext.getUserId();
        if (userId == null || userId.isEmpty()) {
            return R.ok(List.of());
        }
        return R.ok(tenantService.getUserTenants(userId));
    }

    @GetMapping("/{id}/check-quota")
    public R<Boolean> checkQuota(@PathVariable Long id, @RequestParam String type) {
        return R.ok(tenantService.checkQuota(id, type));
    }

    private void assertSuperAdmin() {
        if (!TenantContext.isSuperAdmin()) {
            throw new IllegalArgumentException("仅超级管理员可执行此操作");
        }
    }

    private void assertSuperAdminOrTenantAdmin(Long tenantId) {
        if (TenantContext.isSuperAdmin()) {
            return;
        }
        Long currentTenantId = TenantContext.getTenantId();
        if (!tenantId.equals(currentTenantId)) {
            throw new IllegalArgumentException("无权操作其他租户");
        }
    }
}
