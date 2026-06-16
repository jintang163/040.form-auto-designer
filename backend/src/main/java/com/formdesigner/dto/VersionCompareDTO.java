package com.formdesigner.dto;

import lombok.Data;

@Data
public class VersionCompareDTO {

    private Long templateId;
    private Integer sourceVersion;
    private Integer targetVersion;
}
