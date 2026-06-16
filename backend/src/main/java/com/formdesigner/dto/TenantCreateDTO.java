package com.formdesigner.dto;

import lombok.Data;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

@Data
public class TenantCreateDTO {

    @NotBlank(message = "租户编码不能为空")
    @Size(max = 50, message = "租户编码最长50字符")
    private String tenantCode;

    @NotBlank(message = "租户名称不能为空")
    @Size(max = 200, message = "租户名称最长200字符")
    private String tenantName;

    @Size(max = 500, message = "描述最长500字符")
    private String description;

    private String tablePrefix;

    @NotBlank(message = "管理员账号不能为空")
    private String adminUser;

    private String adminEmail;
    private String adminPhone;

    private Integer maxTemplates;
    private Integer maxFieldsPerTemplate;
    private Integer maxFormSubmissions;
    private Integer maxStorageMb;
    private Integer maxApiCallsDaily;
    private Integer maxWebhookRules;
}
