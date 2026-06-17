package com.formdesigner.dto;

import lombok.Data;
import java.util.Map;

@Data
public class WorkflowStartDTO {
    private Long formDataId;
    private Long templateId;
    private String submitterId;
    private Map<String, Object> variables;
}
