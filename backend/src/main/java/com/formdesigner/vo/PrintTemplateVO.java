package com.formdesigner.vo;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class PrintTemplateVO {

    private Long id;
    private Long templateId;
    private String templateName;
    private String templateCode;
    private String templateType;
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
    private Boolean footerEnabled;
    private String backgroundImageUrl;
    private Boolean backgroundFixed;
    private Boolean isDefault;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
