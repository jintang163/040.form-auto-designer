package com.formdesigner.dto;

import lombok.Data;
import java.util.Map;
import java.util.List;

@Data
public class LinkageEvaluateResultDTO {

    private String targetField;
    private boolean visible;
    private Object computedValue;
    private List<Map<String, String>> dynamicOptions;
    private boolean required;
    private boolean disabled;
    private String message;

    public static LinkageEvaluateResultDTO visible(String targetField) {
        LinkageEvaluateResultDTO r = new LinkageEvaluateResultDTO();
        r.setTargetField(targetField);
        r.setVisible(true);
        return r;
    }

    public static LinkageEvaluateResultDTO hidden(String targetField) {
        LinkageEvaluateResultDTO r = new LinkageEvaluateResultDTO();
        r.setTargetField(targetField);
        r.setVisible(false);
        return r;
    }

    public static LinkageEvaluateResultDTO computed(String targetField, Object value) {
        LinkageEvaluateResultDTO r = new LinkageEvaluateResultDTO();
        r.setTargetField(targetField);
        r.setVisible(true);
        r.setComputedValue(value);
        return r;
    }

    public static LinkageEvaluateResultDTO withOptions(String targetField, List<Map<String, String>> options) {
        LinkageEvaluateResultDTO r = new LinkageEvaluateResultDTO();
        r.setTargetField(targetField);
        r.setVisible(true);
        r.setDynamicOptions(options);
        return r;
    }
}
