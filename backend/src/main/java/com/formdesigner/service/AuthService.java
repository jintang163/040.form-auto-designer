package com.formdesigner.service;

import com.formdesigner.dto.LoginRequestDTO;
import com.formdesigner.dto.LoginResponseDTO;

public interface AuthService {

    LoginResponseDTO login(LoginRequestDTO request, String loginIp, String userAgent);

    void logout(String token);

    boolean validateToken(String token);

    String getUserIdFromToken(String token);
}
