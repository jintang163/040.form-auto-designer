package com.formdesigner.dto;

import lombok.Data;
import java.util.List;

@Data
public class WorkflowDeployDTO {
    private Long templateId;
    private String processKey;
    private String processName;
    private String bpmnXml;
    private String formVariableMapping;
    private Integer multiInstanceType;
    private List<String> assignees;
    private Integer approvalLevels;
}
