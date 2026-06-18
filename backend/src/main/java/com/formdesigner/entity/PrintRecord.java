package com.formdesigner.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class PrintRecord {

    private Long id;
    private Long printTemplateId;
    private Long formDataId;
    private Long templateId;
    private String fileName;
    private String fileUrl;
    private Long fileSize;
    private String printType;
    private Integer printCount;
    private String status;
    private String errorMessage;
    private Long tenantId;
    private LocalDateTime createdAt;
    private String createdBy;
}
