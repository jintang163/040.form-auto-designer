package com.formdesigner.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class FormData {

    private Long id;
    private Long templateId;
    private Integer version;
    private String fieldValuesJson;
    private String submitterId;
    private Long tenantId;
    private LocalDateTime submittedAt;
}
