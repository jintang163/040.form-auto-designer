package com.formdesigner.vo;

import lombok.Data;

@Data
public class ValidationRuleVO {
    private String ruleType;
    private String ruleName;
    private String pattern;
    private Object minValue;
    private Object maxValue;
    private String message;
    private Integer priority;
    private boolean enabled;
}
