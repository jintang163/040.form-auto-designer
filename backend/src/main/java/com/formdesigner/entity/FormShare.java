package com.formdesigner.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class FormShare {

    private Long id;

    private String shareCode;

    private Long templateId;

    private String shareType;

    private LocalDateTime expireAt;

    private String password;

    private Boolean allowEdit;

    private String createdBy;

    private Long tenantId;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private Boolean revoked;
}
