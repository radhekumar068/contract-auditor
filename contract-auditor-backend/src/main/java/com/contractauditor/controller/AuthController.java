package com.contractauditor.controller;

import com.contractauditor.dto.request.ForgotPasswordRequest;
import com.contractauditor.dto.request.LoginRequest;
import com.contractauditor.dto.request.RegisterRequest;
import com.contractauditor.dto.request.ResetPasswordRequest;
import com.contractauditor.dto.response.AuthResponse;
import com.contractauditor.dto.response.MessageResponse;
import com.contractauditor.exception.BadRequestException;
import com.contractauditor.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Register and login endpoints")
@SecurityRequirements
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @Operation(summary = "Register a new user")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        log.info("AuthController.register received email={}", request.email());
        AuthResponse response = authService.register(request);
        log.info("AuthController.register returning userId={}", response.user().id());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    @Operation(summary = "Login and obtain a JWT")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        log.info("AuthController.login received email={}", request.email());
        AuthResponse response = authService.login(request);
        log.info("AuthController.login returning userId={}", response.user().id());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request a password reset email")
    public ResponseEntity<MessageResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        log.info("AuthController.forgotPassword received email={}", request.email());
        MessageResponse response = authService.forgotPassword(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password using a valid reset token from email")
    public ResponseEntity<MessageResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        log.info("AuthController.resetPassword received");
        MessageResponse response = authService.resetPassword(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/reset-password/validate")
    @Operation(summary = "Validate a password reset token from email")
    public ResponseEntity<MessageResponse> validateResetToken(@RequestParam String token) {
        log.info("AuthController.validateResetToken received");
        if (token.isBlank()) {
            throw new BadRequestException("This password reset link is invalid or has expired.");
        }
        MessageResponse response = authService.validateResetToken(token);
        return ResponseEntity.ok(response);
    }
}
