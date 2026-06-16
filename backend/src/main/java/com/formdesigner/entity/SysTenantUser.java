package com.formdesigner.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class SysTenantUser {

    private Long id;
    private Long tenantId;
    private String userId;
    private String userName;
    private String role;
    private LocalDateTime joinedAt;
}
