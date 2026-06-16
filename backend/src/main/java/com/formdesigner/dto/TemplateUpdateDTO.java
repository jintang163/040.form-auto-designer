package com.formdesigner.dto;

import lombok.Data;

@Data
public class TemplateUpdateDTO {

    private String templateName;
    private String templateCode;
    private String description;
    private String schemaJson;
    private String status;
    private String changeLog;
}
