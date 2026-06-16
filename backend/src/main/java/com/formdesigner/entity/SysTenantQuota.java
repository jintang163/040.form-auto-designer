package com.formdesigner.entity;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class SysTenantQuota {

    private Long id;
    private Long tenantId;
    private Integer maxTemplates;
    private Integer maxFieldsPerTemplate;
    private Integer maxFormSubmissions;
    private Integer maxStorageMb;
    private Integer maxApiCallsDaily;
    private Integer maxWebhookRules;
    private Integer currentTemplates;
    private Integer currentFormSubmissions;
    private BigDecimal currentStorageMb;
    private Integer currentApiCallsDaily;
    private String currentApiCallsDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
