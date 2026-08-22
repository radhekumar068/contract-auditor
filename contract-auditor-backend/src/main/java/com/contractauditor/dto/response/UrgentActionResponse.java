package com.contractauditor.dto.response;

import com.contractauditor.domain.enums.SubscriptionStatus;
import java.math.BigDecimal;
import java.time.LocalDate;

public record UrgentActionResponse(
        Long subscriptionId,
        String subscriptionName,
        String provider,
        String category,
        SubscriptionStatus status,
        LocalDate cancellationDeadline,
        LocalDate renewalDate,
        int daysUntilDeadline,
        String urgencyLevel,
        BigDecimal amount,
        String currency,
        String cancellationWorkflow
) {
}
