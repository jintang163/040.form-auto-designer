package com.formdesigner.dto;

import lombok.Data;
import javax.validation.constraints.NotNull;

@Data
public class FormShareDTO {

    @NotNull(message = "模板ID不能为空")
    private Long templateId;

    private String shareType;

    private Integer expireHours;

    private String password;

    private Boolean allowEdit;

    private String createdBy;
}
