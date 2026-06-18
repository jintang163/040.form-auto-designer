package com.formdesigner.entity;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class PrintTemplate {

    private Long id;
    private Long templateId;
    private String templateName;
    private String templateCode;
    private String templateType;
    private String templateContent;
    private String paperSize;
    private String orientation;
    private BigDecimal marginTop;
    private BigDecimal marginBottom;
    private BigDecimal marginLeft;
    private BigDecimal marginRight;
    private Boolean watermarkEnabled;
    private String watermarkText;
    private BigDecimal watermarkOpacity;
    private Integer watermarkRotation;
    private Integer watermarkFontSize;
    private String watermarkColor;
    private Boolean headerEnabled;
    private String headerContent;
    private Boolean footerEnabled;
    private String footerContent;
    private String backgroundImageUrl;
    private Boolean backgroundFixed;
    private Boolean isDefault;
    private String status;
    private Long tenantId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
}
