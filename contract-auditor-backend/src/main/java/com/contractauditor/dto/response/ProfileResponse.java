package com.contractauditor.dto.response;

import com.contractauditor.domain.enums.UserRole;
import java.time.Instant;

public record ProfileResponse(
        String email,
        String fullName,
        UserRole role,
        Instant createdAt,
        Instant lastLoginAt,
        String countryCode,
        String preferredCurrency,
        int activeDeviceCount,
        String phoneNumber
) {
}
