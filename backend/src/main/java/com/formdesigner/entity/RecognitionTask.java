package com.formdesigner.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class RecognitionTask {

    private Long id;
    private String taskId;
    private Long fileId;
    private String fileType;
    private String status;
    private Integer progress;
    private String result;
    private String errorMessage;
    private Long tenantId;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
}
