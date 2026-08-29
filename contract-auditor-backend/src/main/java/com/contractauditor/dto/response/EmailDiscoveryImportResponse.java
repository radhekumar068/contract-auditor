package com.contractauditor.dto.response;

import java.util.List;

public record EmailDiscoveryImportResponse(
        List<SubscriptionResponse> imported,
        List<String> skipped,
        List<ImportError> errors
) {

    public record ImportError(
            String vendorKey,
            String message
    ) {
    }
}
