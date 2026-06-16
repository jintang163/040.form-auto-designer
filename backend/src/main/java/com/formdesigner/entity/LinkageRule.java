package com.formdesigner.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class LinkageRule {

    private Long id;
    private Long templateId;
    private String ruleName;
    private String ruleType;
    private String sourceField;
    private String targetField;
    private String conditionExpr;
    private String actionType;
    private String actionValue;
    private String expression;
    private String dynamicOptionsUrl;
    private Integer sortOrder;
    private Boolean enabled;
    private Long tenantId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
