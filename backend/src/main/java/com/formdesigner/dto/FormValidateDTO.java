package com.formdesigner.dto;

import lombok.Data;
import java.util.Map;

@Data
public class FormValidateDTO {
    private Long templateId;
    private Map<String, Object> fieldValues;
    private String submitterId;
    private boolean enableSuggestions;
    private boolean enableAutoCorrect;
    private boolean partialValidation;
}
