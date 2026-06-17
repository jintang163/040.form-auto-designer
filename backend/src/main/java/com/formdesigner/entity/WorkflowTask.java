package com.formdesigner.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class WorkflowTask {
    private Long id;
    private Long workflowInstanceId;
    private String taskId;
    private String taskName;
    private String taskDefinitionKey;
    private String assignee;
    private String action;
    private String comment;
    private Integer approvalLevel;
    private LocalDateTime claimedAt;
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;
}
