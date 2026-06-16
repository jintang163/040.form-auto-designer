package com.formdesigner.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class FieldValueStats {
    private Long id;
    private Long tenantId;
    private Long templateId;
    private String fieldName;
    private String fieldValue;
    private String submitterId;
    private Integer frequency;
    private LocalDateTime lastUsedAt;
    private LocalDateTime updatedAt;
}
