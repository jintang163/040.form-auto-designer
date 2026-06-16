package com.formdesigner.dto;

import lombok.Data;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

@Data
public class TenantUpdateDTO {

    @NotBlank(message = "租户名称不能为空")
    @Size(max = 200, message = "租户名称最长200字符")
    private String tenantName;

    @Size(max = 500, message = "描述最长500字符")
    private String description;

    private String adminEmail;
    private String adminPhone;
    private String status;
}
