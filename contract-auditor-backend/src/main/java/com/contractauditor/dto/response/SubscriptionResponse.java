package com.contractauditor.dto.response;

import com.contractauditor.domain.enums.BillingFrequency;
import com.contractauditor.domain.enums.CommitmentType;
import com.contractauditor.domain.enums.NotificationEventType;
import com.contractauditor.domain.enums.SubscriptionStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record SubscriptionResponse(
        Long id,
        String name,
        String category,
        String provider,
        SubscriptionStatus status,
        CommitmentType commitmentType,
        LocalDate startDate,
        String notes,
        String cancellationWorkflow,
        String negotiationWorkflow,
        ContractTermResponse contractTerm,
        List<NotificationScheduleResponse> notificationSchedules
) {

    public record ContractTermResponse(
            Long id,
            BillingFrequency billingFrequency,
            BigDecimal amount,
            String currency,
            LocalDate trialEndDate,
            LocalDate renewalDate,
            LocalDate cancellationDeadlineDate,
            Integer cancellationDeadlineDays,
            Boolean autoRenew,
            LocalDate contractEndDate,
            Boolean isRefundable
    ) {
    }

    public record NotificationScheduleResponse(
            Long id,
            Integer daysBeforeEvent,
            NotificationEventType eventType,
            Boolean enabled
    ) {
    }
}
