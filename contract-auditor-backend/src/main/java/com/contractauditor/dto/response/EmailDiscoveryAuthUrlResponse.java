package com.contractauditor.dto.response;

public record EmailDiscoveryAuthUrlResponse(
        String authUrl,
        String state
) {
}
