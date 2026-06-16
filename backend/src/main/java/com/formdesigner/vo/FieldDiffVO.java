package com.formdesigner.vo;

import lombok.Data;

@Data
public class FieldDiffVO {

    private String fieldName;
    private String fieldLabel;
    private String changeType;
    private String oldValue;
    private String newValue;
}
