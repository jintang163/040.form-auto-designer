package com.formdesigner.dto;

import lombok.Data;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.math.BigDecimal;

@Data
public class PrintTemplateDTO {

    private Long id;

    @NotNull(message = "表单模板ID不能为空")
    private Long templateId;

    @NotBlank(message = "打印模板名称不能为空")
    private String templateName;

    @NotBlank(message = "打印模板编码不能为空")
    private String templateCode;

    private String templateType = "NORMAL";
    private String templateContent;
    private String paperSize = "A4";
    private String orientation = "PORTRAIT";
    private BigDecimal marginTop = new BigDecimal("2.54");
    private BigDecimal marginBottom = new BigDecimal("2.54");
    private BigDecimal marginLeft = new BigDecimal("2.54");
    private BigDecimal marginRight = new BigDecimal("2.54");
    private Boolean watermarkEnabled = false;
    private String watermarkText;
    private BigDecimal watermarkOpacity = new BigDecimal("0.3");
    private Integer watermarkRotation = 30;
    private Integer watermarkFontSize = 50;
    private String watermarkColor = "#CCCCCC";
    private Boolean headerEnabled = false;
    private String headerContent;
    private Boolean footerEnabled = false;
    private String footerContent;
    private String backgroundImageUrl;
    private Boolean backgroundFixed = true;
    private Boolean isDefault = false;
    private String status = "ACTIVE";
}
