package com.formdesigner.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class SysTenant {

    private Long id;
    private String tenantCode;
    private String tenantName;
    private String description;
    private String tablePrefix;
    private String adminUser;
    private String adminEmail;
    private String adminPhone;
    private String status;
    private Integer isSystem;
    private LocalDateTime expiredAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Integer isDeleted;
}
