package com.formdesigner.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class SysUserSession {

    private Long id;
    private String sessionId;
    private String userId;
    private String loginIp;
    private String userAgent;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
}
