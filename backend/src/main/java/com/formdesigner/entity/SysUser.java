package com.formdesigner.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class SysUser {

    private Long id;
    private String userId;
    private String userName;
    private String passwordHash;
    private String email;
    private String phone;
    private String avatarUrl;
    private String status;
    private Integer isSuperAdmin;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Integer isDeleted;
}
