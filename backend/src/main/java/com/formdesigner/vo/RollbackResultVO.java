package com.formdesigner.vo;

import com.formdesigner.entity.FormField;
import com.formdesigner.entity.FormTemplate;
import lombok.Data;

import java.util.List;

@Data
public class RollbackResultVO {

    private FormTemplate template;
    private List<FormField> fields;
    private Integer newVersion;
}
