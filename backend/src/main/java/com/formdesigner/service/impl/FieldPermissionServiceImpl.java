package com.formdesigner.service.impl;

import com.formdesigner.common.TenantContext;
import com.formdesigner.entity.FormFieldPermission;
import com.formdesigner.mapper.FormFieldPermissionMapper;
import com.formdesigner.service.FieldPermissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class FieldPermissionServiceImpl implements FieldPermissionService {

    private final FormFieldPermissionMapper permissionMapper;

    private Long currentTenantId() {
        Long tid = TenantContext.getTenantId();
        return tid != null ? tid : 1L;
    }

    private String currentUserRole() {
        String role = TenantContext.getUserRole();
        return role != null ? role : TenantContext.USER;
    }

    private String currentUserId() {
        String userId = TenantContext.getUserId();
        return userId != null ? userId : "anonymous";
    }

    @Override
    public boolean canViewSensitive(Long templateId, String fieldName) {
        FormFieldPermission perm = getPermission(templateId, fieldName);
        return perm != null && Boolean.TRUE.equals(perm.getCanViewSensitive());
    }

    @Override
    public boolean canEdit(Long templateId, String fieldName) {
        FormFieldPermission perm = getPermission(templateId, fieldName);
        return perm != null && Boolean.TRUE.equals(perm.getCanEdit());
    }

    @Override
    public boolean canExport(Long templateId, String fieldName) {
        FormFieldPermission perm = getPermission(templateId, fieldName);
        return perm != null && Boolean.TRUE.equals(perm.getCanExport());
    }

    @Override
    public FormFieldPermission getPermission(Long templateId, String fieldName) {
        String userId = currentUserId();
        String role = currentUserRole();
        Long tenantId = currentTenantId();

        List<FormFieldPermission> perms = permissionMapper.selectByTemplateAndField(
                templateId, fieldName, tenantId);

        FormFieldPermission bestMatch = null;
        for (FormFieldPermission perm : perms) {
            if (perm.getUserId() != null && perm.getUserId().equals(userId)) {
                return perm;
            }
            if (perm.getRoleName() != null && perm.getRoleName().equals(role)) {
                if (bestMatch == null) {
                    bestMatch = perm;
                } else if (perm.getTemplateId() != null && bestMatch.getTemplateId() == null) {
                    bestMatch = perm;
                }
            }
        }

        if (bestMatch == null) {
            bestMatch = new FormFieldPermission();
            bestMatch.setCanViewSensitive(TenantContext.isSuperAdmin());
            bestMatch.setCanEdit(true);
            bestMatch.setCanExport(TenantContext.isSuperAdmin());
        }

        return bestMatch;
    }

    @Override
    public List<FormFieldPermission> getPermissions(Long templateId) {
        return permissionMapper.selectByTemplateAndField(templateId, null, currentTenantId());
    }

    @Override
    public FormFieldPermission savePermission(FormFieldPermission permission) {
        permission.setTenantId(currentTenantId());
        if (permission.getId() != null) {
            permissionMapper.update(permission);
        } else {
            permissionMapper.insert(permission);
        }
        return permission;
    }

    @Override
    public void deletePermission(Long id) {
        permissionMapper.deleteById(id);
    }
}
