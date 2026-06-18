package com.formdesigner.controller;

import com.formdesigner.common.R;
import com.formdesigner.entity.FormFieldPermission;
import com.formdesigner.service.FieldPermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/field-permissions")
@RequiredArgsConstructor
public class FieldPermissionController {

    private final FieldPermissionService permissionService;

    @GetMapping("/template/{templateId}")
    public R<List<FormFieldPermission>> getPermissions(@PathVariable Long templateId) {
        return R.ok(permissionService.getPermissions(templateId));
    }

    @PostMapping
    public R<FormFieldPermission> savePermission(@RequestBody FormFieldPermission permission) {
        return R.ok(permissionService.savePermission(permission));
    }

    @DeleteMapping("/{id}")
    public R<Void> deletePermission(@PathVariable Long id) {
        permissionService.deletePermission(id);
        return R.ok();
    }

    @GetMapping("/check")
    public R<Map<String, Boolean>> checkPermission(
            @RequestParam Long templateId,
            @RequestParam String fieldName) {
        Map<String, Boolean> result = new java.util.HashMap<>();
        result.put("canViewSensitive", permissionService.canViewSensitive(templateId, fieldName));
        result.put("canEdit", permissionService.canEdit(templateId, fieldName));
        result.put("canExport", permissionService.canExport(templateId, fieldName));
        return R.ok(result);
    }
}
