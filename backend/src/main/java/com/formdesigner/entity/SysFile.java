package com.formdesigner.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class SysFile {

    private Long id;
    private String fileName;
    private String filePath;
    private String fileType;
    private Long fileSize;
    private String bucketName;
    private String businessType;
    private String businessId;
    private String uploadedBy;
    private Long tenantId;
    private LocalDateTime uploadedAt;
}
