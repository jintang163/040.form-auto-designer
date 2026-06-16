package com.formdesigner.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class WebhookRule {
    private Long id;
    private Long tenantId;
    private String ruleName;
    private Long templateId;
    private String webhookUrl;
    private String httpMethod;
    private String headersJson;
    private Boolean enabled;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
