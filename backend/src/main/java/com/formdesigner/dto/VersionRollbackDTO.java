package com.formdesigner.dto;

import lombok.Data;

import javax.validation.constraints.NotNull;

@Data
public class VersionRollbackDTO {

    @NotNull(message = "目标版本号不能为空")
    private Integer targetVersion;

    private String changeLog;
}
