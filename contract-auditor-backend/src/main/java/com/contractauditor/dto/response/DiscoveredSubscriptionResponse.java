package com.contractauditor.dto.response;

import com.contractauditor.domain.enums.BillingFrequency;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record DiscoveredSubscriptionResponse(
        String vendorKey,
        String name,
        String provider,
        String category,
        BigDecimal amount,
        String currency,
        BillingFrequency billingFrequency,
        LocalDate renewalDate,
        double confidence,
        boolean alreadyExists,
        String sourceSubject
) {
}
