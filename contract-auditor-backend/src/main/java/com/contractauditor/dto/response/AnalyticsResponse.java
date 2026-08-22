package com.contractauditor.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record AnalyticsResponse(
        int year,
        int healthScore,
        BigDecimal totalAnnualCost,
        BigDecimal monthlyAverage,
        BigDecimal potentialSavings,
        BigDecimal financialLeakage,
        List<CategoryCostResponse> categoryBreakdown,
        List<MonthlyCostResponse> monthlyTrend
) {

    public record CategoryCostResponse(
            String category,
            BigDecimal amount,
            double percentage
    ) {
    }

    public record MonthlyCostResponse(
            int month,
            String monthLabel,
            BigDecimal amount
    ) {
    }
}
