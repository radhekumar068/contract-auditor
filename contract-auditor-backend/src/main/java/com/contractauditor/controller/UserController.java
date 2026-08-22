package com.contractauditor.controller;

import com.contractauditor.dto.request.ChangePasswordRequest;
import com.contractauditor.dto.request.UpdateProfileRequest;
import com.contractauditor.dto.response.ProfileResponse;
import com.contractauditor.dto.response.UpdateProfileResponse;
import com.contractauditor.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@PreAuthorize("isAuthenticated()")
@Tag(name = "Users", description = "Current user profile and password")
public class UserController {

    private static final Logger log = LoggerFactory.getLogger(UserController.class);

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    @Operation(summary = "Get the authenticated user's profile")
    public ProfileResponse getCurrentProfile() {
        log.info("UserController.getCurrentProfile received");
        ProfileResponse response = userService.getCurrentProfile();
        log.info("UserController.getCurrentProfile returning email={}", response.email());
        return response;
    }

    @PutMapping("/me")
    @Operation(summary = "Update the authenticated user's name and email")
    public UpdateProfileResponse updateCurrentProfile(@Valid @RequestBody UpdateProfileRequest request) {
        log.info("UserController.updateCurrentProfile received email={}", request.email());
        UpdateProfileResponse response = userService.updateCurrentProfile(request);
        log.info("UserController.updateCurrentProfile returning email={}", response.profile().email());
        return response;
    }

    @PostMapping("/me/password")
    @Operation(summary = "Change the authenticated user's password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        log.info("UserController.changePassword received");
        userService.changePassword(request);
        log.info("UserController.changePassword completed");
        return ResponseEntity.noContent().build();
    }
}
