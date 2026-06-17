package com.formdesigner.vo;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class FormShareVO {

    private String shareCode;

    private String shareUrl;

    private String qrCodeUrl;

    private Long templateId;

    private String templateName;

    private String shareType;

    private LocalDateTime expireAt;

    private Boolean hasPassword;

    private Boolean allowEdit;

    private String createdBy;

    private LocalDateTime createdAt;
}
