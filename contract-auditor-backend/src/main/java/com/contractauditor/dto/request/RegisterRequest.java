package com.contractauditor.dto.request;

import com.contractauditor.domain.enums.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 100) String password,
        @NotBlank @Size(max = 255) String fullName,
        @NotBlank @Pattern(regexp = "^\\d{10,15}$") String phoneNumber,
        @NotBlank @Pattern(regexp = "^[A-Za-z]{2}$") String countryCode,
        @NotNull UserRole role
) {
}
