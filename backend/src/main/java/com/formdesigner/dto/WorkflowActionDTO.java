package com.formdesigner.dto;

import lombok.Data;

import java.util.Map;

@Data
public class WorkflowActionDTO {
    private String taskId;
    private String action;
    private String assignee;
    private String comment;
    private String outcome;
    private Map<String, Object> formData;
}
