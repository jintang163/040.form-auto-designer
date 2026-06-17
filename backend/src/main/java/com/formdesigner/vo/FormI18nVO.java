package com.formdesigner.vo;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.Map;

@Data
public class FormI18nVO {

    private String resourceKey;

    private String language;

    private String resourceValue;

    private String resourceType;

    private Long templateId;

    private String fieldName;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
