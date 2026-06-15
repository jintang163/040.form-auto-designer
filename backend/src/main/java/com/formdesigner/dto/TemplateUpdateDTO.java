package com.formdesigner.dto;

import lombok.Data;

@Data
public class TemplateUpdateDTO {

    private String templateName;
    private String schemaJson;
    private Integer status;
    private String changeLog;
}
