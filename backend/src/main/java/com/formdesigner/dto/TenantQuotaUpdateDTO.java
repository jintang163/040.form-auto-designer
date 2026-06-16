package com.formdesigner.dto;

import lombok.Data;

@Data
public class TenantQuotaUpdateDTO {

    private Integer maxTemplates;
    private Integer maxFieldsPerTemplate;
    private Integer maxFormSubmissions;
    private Integer maxStorageMb;
    private Integer maxApiCallsDaily;
    private Integer maxWebhookRules;
}
