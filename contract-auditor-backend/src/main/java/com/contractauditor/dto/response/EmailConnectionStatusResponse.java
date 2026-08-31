package com.contractauditor.dto.response;

import java.time.Instant;

public record EmailConnectionStatusResponse(
        boolean featureEnabled,
        boolean settingEnabled,
        boolean connected,
        String emailAddress,
        Instant connectedAt,
        Instant lastSyncAt
) {
}
