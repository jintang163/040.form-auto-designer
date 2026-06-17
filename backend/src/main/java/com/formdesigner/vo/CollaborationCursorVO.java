package com.formdesigner.vo;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class CollaborationCursorVO {

    private String sessionId;

    private String userId;

    private String userName;

    private String avatarColor;

    private String currentField;

    private String fieldLabel;

    private Double scrollTop;

    private LocalDateTime lastActive;
}
