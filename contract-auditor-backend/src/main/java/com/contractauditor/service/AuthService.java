package com.contractauditor.service;

import com.contractauditor.dto.request.ForgotPasswordRequest;
import com.contractauditor.dto.request.LoginRequest;
import com.contractauditor.dto.request.RegisterRequest;
import com.contractauditor.dto.request.ResetPasswordRequest;
import com.contractauditor.dto.response.AuthResponse;
import com.contractauditor.dto.response.MessageResponse;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    MessageResponse forgotPassword(ForgotPasswordRequest request);

    MessageResponse resetPassword(ResetPasswordRequest request);

    MessageResponse validateResetToken(String token);
}
