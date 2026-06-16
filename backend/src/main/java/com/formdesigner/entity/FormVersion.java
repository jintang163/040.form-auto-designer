package com.formdesigner.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class FormVersion {

    private Long id;
    private Long templateId;
    private Integer version;
    private String schemaJson;
    private String fieldsJson;
    private String changeLog;
    private LocalDateTime createdAt;
}
