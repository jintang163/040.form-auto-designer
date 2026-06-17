package com.formdesigner.dto;

import lombok.Data;
import javax.validation.constraints.NotBlank;
import java.util.Map;

@Data
public class FormI18nDTO {

    private Long templateId;

    private String fieldName;

    @NotBlank(message = "语言不能为空")
    private String language;

    @NotBlank(message = "资源键不能为空")
    private String resourceKey;

    @NotBlank(message = "翻译内容不能为空")
    private String resourceValue;

    private String resourceType;

    private Map<String, String> translations;
}
