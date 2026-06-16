package com.formdesigner.dto;

import lombok.Data;
import javax.validation.constraints.NotBlank;

@Data
public class LoginRequestDTO {

    @NotBlank(message = "账号不能为空")
    private String userId;

    @NotBlank(message = "密码不能为空")
    private String password;
}
