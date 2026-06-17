package com.formdesigner.dto;

import lombok.Data;

@Data
public class WorkflowActionDTO {
    private String taskId;
    private String action;
    private String assignee;
    private String comment;
    private String outcome;
}
