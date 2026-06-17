package com.formdesigner.vo;

import lombok.Data;
import java.util.List;

@Data
public class FormValidationResultVO {
    private Long templateId;
    private boolean overallValid;
    private List<FieldValidationResultVO> fieldResults;
    private Integer totalErrors;
    private Integer totalWarnings;
    private Integer totalSuggestions;
}
