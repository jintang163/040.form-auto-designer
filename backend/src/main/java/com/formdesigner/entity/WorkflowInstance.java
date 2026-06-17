package com.formdesigner.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class WorkflowInstance {
    private Long id;
    private Long formDataId;
    private Long templateId;
    private String processInstanceId;
    private String processDefinitionId;
    private String businessKey;
    private String status;
    private String submitterId;
    private String currentAssignee;
    private Integer currentLevel;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String outcome;
    private Long tenantId;
    private LocalDateTime createdAt;
}
