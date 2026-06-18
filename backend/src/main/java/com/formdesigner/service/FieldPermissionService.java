package com.formdesigner.service;

import com.formdesigner.entity.FormFieldPermission;

import java.util.List;

public interface FieldPermissionService {

    boolean canViewSensitive(Long templateId, String fieldName);

    boolean canEdit(Long templateId, String fieldName);

    boolean canExport(Long templateId, String fieldName);

    FormFieldPermission getPermission(Long templateId, String fieldName);

    List<FormFieldPermission> getPermissions(Long templateId);

    FormFieldPermission savePermission(FormFieldPermission permission);

    void deletePermission(Long id);
}
