package com.formdesigner.vo;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class WorkflowProcessVO {
    private Long id;
    private Long templateId;
    private String processKey;
    private String processName;
    private String processDefinitionId;
    private String formVariableMapping;
    private Integer multiInstanceType;
    private List<String> assignees;
    private Integer approvalLevels;
    private String status;
    private LocalDateTime createdAt;
}
