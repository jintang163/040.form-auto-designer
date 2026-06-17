package com.formdesigner.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class WorkflowProcess {
    private Long id;
    private Long templateId;
    private String processKey;
    private String processName;
    private String processDefinitionId;
    private String bpmnXml;
    private String formVariableMapping;
    private Integer multiInstanceType;
    private String assignees;
    private Integer approvalLevels;
    private String status;
    private Long tenantId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
