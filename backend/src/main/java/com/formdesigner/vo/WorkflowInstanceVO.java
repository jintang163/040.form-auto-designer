package com.formdesigner.vo;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
public class WorkflowInstanceVO {
    private Long id;
    private Long formDataId;
    private Long templateId;
    private String processInstanceId;
    private String status;
    private String submitterId;
    private String currentAssignee;
    private Integer currentLevel;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String outcome;
    private List<TaskVO> tasks;
    private Map<String, Object> processVariables;

    @Data
    public static class TaskVO {
        private String taskId;
        private String taskName;
        private String assignee;
        private String action;
        private String comment;
        private Integer approvalLevel;
        private LocalDateTime claimedAt;
        private LocalDateTime completedAt;
    }
}
