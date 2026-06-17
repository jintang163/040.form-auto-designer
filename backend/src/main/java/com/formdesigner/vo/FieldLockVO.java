package com.formdesigner.vo;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class FieldLockVO {

    private String fieldName;

    private String fieldLabel;

    private String lockedBy;

    private String lockedByName;

    private String avatarColor;

    private LocalDateTime lockedAt;

    private LocalDateTime expireAt;
}
