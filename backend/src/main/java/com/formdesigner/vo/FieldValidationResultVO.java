package com.formdesigner.vo;

import lombok.Data;
import java.util.List;

@Data
public class FieldValidationResultVO {
    private String fieldName;
    private String fieldLabel;
    private boolean valid;
    private List<ValidationErrorVO> errors;
    private List<ValidationSuggestionVO> suggestions;
    private String autoCorrectedValue;

    @Data
    public static class ValidationErrorVO {
        private String errorCode;
        private String errorMessage;
        private String ruleType;
        private Integer severity;
    }

    @Data
    public static class ValidationSuggestionVO {
        private String suggestionType;
        private String suggestionMessage;
        private String suggestedValue;
        private Double confidence;
        private String source;
    }
}
