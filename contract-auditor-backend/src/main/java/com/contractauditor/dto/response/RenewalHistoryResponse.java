package com.contractauditor.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record RenewalHistoryResponse(
        Long id,
        Long subscriptionId,
        String subscriptionName,
        BigDecimal previousAmount,
        BigDecimal newAmount,
        LocalDate renewalDate,
        BigDecimal changePercentage,
        String notes
) {
}
