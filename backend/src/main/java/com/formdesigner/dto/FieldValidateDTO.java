package com.formdesigner.dto;

import lombok.Data;
import java.util.Map;

@Data
public class FieldValidateDTO {
    private Long templateId;
    private String fieldName;
    private Object fieldValue;
    private Map<String, Object> contextData;
    private String submitterId;
    private boolean enableSuggestions;
    private boolean enableAutoCorrect;
}
