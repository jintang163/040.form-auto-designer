package com.formdesigner.dto;

import lombok.Data;

@Data
public class LoginResponseDTO {

    private String token;
    private String userId;
    private String userName;
    private String role;
    private String email;
    private String avatarUrl;
    private java.util.List<com.formdesigner.entity.SysTenantUser> tenants;
}
