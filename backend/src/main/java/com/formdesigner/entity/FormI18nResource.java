package com.formdesigner.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class FormI18nResource {

    private Long id;

    private String resourceKey;

    private String language;

    private String resourceValue;

    private String resourceType;

    private Long templateId;

    private String fieldName;

    private Long tenantId;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
