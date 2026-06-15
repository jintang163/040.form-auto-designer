package com.formdesigner.dto;

import lombok.Data;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

@Data
public class FormSubmitDTO {

    @NotNull(message = "模板ID不能为空")
    private Long templateId;

    private Integer version;

    @NotBlank(message = "表单数据不能为空")
    private String fieldValuesJson;

    private String submitterId;
}
