package com.contractauditor.dto.response;

import com.contractauditor.domain.enums.NotificationEventType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record TimelineEventResponse(
        Long subscriptionId,
        String subscriptionName,
        String category,
        String provider,
        NotificationEventType eventType,
        LocalDate eventDate,
        LocalDate actionDeadline,
        BigDecimal amount,
        String currency,
        String cancellationWorkflow,
        String negotiationWorkflow,
        int daysRemaining
) {
}
