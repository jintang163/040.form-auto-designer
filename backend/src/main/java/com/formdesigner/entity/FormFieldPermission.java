package com.formdesigner.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class FormFieldPermission {

    private Long id;
    private Long tenantId;
    private Long templateId;
    private String fieldName;
    private String roleName;
    private String userId;
    private Boolean canViewSensitive;
    private Boolean canEdit;
    private Boolean canExport;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
