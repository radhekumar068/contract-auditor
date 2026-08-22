package com.contractauditor.dto.response;

import com.contractauditor.domain.enums.UserRole;
import java.time.Instant;


public record UserResponse(
        Long id,
        String email,
        String fullName,
        UserRole role,
        Instant createdAt,
        Instant lastLoginAt,
        String countryCode,
        String preferredCurrency
) {
}
