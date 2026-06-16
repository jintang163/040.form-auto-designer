package com.formdesigner.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class FormDraft {

    private Long id;
    private Long templateId;
    private String fieldValues;
    private String userId;
    private String deviceId;
    private Long tenantId;
    private LocalDateTime savedAt;
}
