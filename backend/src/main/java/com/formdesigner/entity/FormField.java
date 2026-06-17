package com.formdesigner.entity;

import lombok.Data;

@Data
public class FormField {

    private Long id;
    private Long templateId;
    private String fieldName;
    private String fieldLabel;
    private String fieldType;
    private String inputType;
    private Boolean required;
    private String defaultValue;
    private String validationRules;
    private Integer sortOrder;
    private String layoutConfig;
    private Long tenantId;
    private String fieldLabelI18n;
    private String optionsI18n;
}
