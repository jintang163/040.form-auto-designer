package com.formdesigner.dto;

import lombok.Data;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

@Data
public class FieldConfigDTO {

    @NotNull(message = "模板ID不能为空")
    private Long templateId;

    @NotBlank(message = "字段名称不能为空")
    private String fieldName;

    @NotBlank(message = "字段标签不能为空")
    private String fieldLabel;

    @NotBlank(message = "字段类型不能为空")
    private String fieldType;

    private String inputType;
    private Boolean required;
    private String defaultValue;
    private String validationRules;
    private Integer sortOrder;
    private String layoutConfig;
}
