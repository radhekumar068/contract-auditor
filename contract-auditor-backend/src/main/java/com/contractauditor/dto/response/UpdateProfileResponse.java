package com.contractauditor.dto.response;

public record UpdateProfileResponse(
        ProfileResponse profile,
        String accessToken,
        String tokenType
) {
}
