package com.formdesigner.dto;

import lombok.Data;

@Data
public class CollaborationMessageDTO {

    private String type;

    private String shareCode;

    private String sessionId;

    private String userId;

    private String userName;

    private String avatarColor;

    private String fieldName;

    private String fieldLabel;

    private Object fieldValue;

    private Double scrollTop;

    private Long timestamp;
}
