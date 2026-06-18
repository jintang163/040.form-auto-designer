package com.formdesigner.dto;

import lombok.Data;
import javax.validation.constraints.NotEmpty;
import javax.validation.constraints.NotNull;
import java.util.List;

@Data
public class BatchPdfExportRequestDTO {

    @NotEmpty(message = "表单数据ID列表不能为空")
    private List<Long> formDataIds;

    private Long printTemplateId;

    private String printTemplateCode;

    @NotNull(message = "合并方式不能为空")
    private Boolean mergeIntoSingleFile = true;

    private String customFileName;
}
