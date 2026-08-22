package com.contractauditor.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record DashboardResponse(
        int healthScore,
        BigDecimal totalAnnualCost,
        BigDecimal monthlyAverage,
        BigDecimal financialLeakage,
        BigDecimal potentialSavings,
        List<AnalyticsResponse.CategoryCostResponse> categoryBreakdown,
        List<AnalyticsResponse.MonthlyCostResponse> monthlyTrend,
        UrgentActionResponse mostUrgentAction,
        List<UrgentActionResponse> urgentActions
) {
}
