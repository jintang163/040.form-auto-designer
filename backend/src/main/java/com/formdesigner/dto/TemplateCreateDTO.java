package com.formdesigner.dto;

import lombok.Data;
import javax.validation.constraints.NotBlank;

@Data
public class TemplateCreateDTO {

    @NotBlank(message = "模板名称不能为空")
    private String templateName;

    @NotBlank(message = "模板编码不能为空")
    private String templateCode;

    private String schemaJson;
}
