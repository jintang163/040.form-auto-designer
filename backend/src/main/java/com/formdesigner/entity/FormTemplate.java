package com.formdesigner.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class FormTemplate {

    private Long id;
    private String templateName;
    private String templateCode;
    private String description;
    private String schemaJson;
    private Integer version;
    private String status;
    private String originalDocxUrl;
    private String originalHtml;
    private String originalTablesJson;
    private Long tenantId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
