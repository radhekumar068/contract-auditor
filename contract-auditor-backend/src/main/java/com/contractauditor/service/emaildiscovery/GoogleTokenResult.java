package com.contractauditor.service.emaildiscovery;

import java.time.Instant;

public record GoogleTokenResult(
        String accessToken,
        String refreshToken,
        Instant expiresAt,
        String emailAddress,
        String scopes
) {
}
