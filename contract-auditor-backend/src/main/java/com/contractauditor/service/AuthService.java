package com.contractauditor.service;

import com.contractauditor.dto.request.LoginRequest;
import com.contractauditor.dto.request.RegisterRequest;
import com.contractauditor.dto.response.AuthResponse;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);
}
