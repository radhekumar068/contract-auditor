package com.contractauditor.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CalendarDayResponse(
        LocalDate date,
        BigDecimal totalAmount,
        String currency,
        List<CalendarEventResponse> events
) {

    public record CalendarEventResponse(
            Long subscriptionId,
            String subscriptionName,
            String provider,
            String eventType,
            BigDecimal amount,
            String currency
    ) {
    }
}
