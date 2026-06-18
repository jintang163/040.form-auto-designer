package com.formdesigner.dto;

import lombok.Data;
import javax.validation.constraints.NotNull;
import java.util.List;

@Data
public class PdfExportRequestDTO {

    @NotNull(message = "表单数据ID不能为空")
    private Long formDataId;

    private Long printTemplateId;

    private String printTemplateCode;

    private Boolean saveToServer = false;

    private String customFileName;

    private List<String> excludeFields;

    private String watermarkText;
}
