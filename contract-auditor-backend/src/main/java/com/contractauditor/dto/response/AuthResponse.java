package com.contractauditor.dto.response;

public record AuthResponse(
        String accessToken,
        String tokenType,
        UserResponse user
) {
}
