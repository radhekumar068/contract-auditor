package com.contractauditor.dto.response;

import java.util.List;

public record EmailDiscoveryScanResponse(
        int messagesScanned,
        List<DiscoveredSubscriptionResponse> suggestions
) {
}
