package com.contractauditor.dto.request;

import com.contractauditor.domain.enums.BillingFrequency;
import com.contractauditor.domain.enums.CommitmentType;
import com.contractauditor.domain.enums.NotificationEventType;
import com.contractauditor.domain.enums.SubscriptionStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CreateSubscriptionRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 100) String category,
        @NotBlank @Size(max = 255) String provider,
        @NotNull SubscriptionStatus status,
        @NotNull CommitmentType commitmentType,
        @NotNull LocalDate startDate,
        @Size(max = 5000) String notes,
        @Size(max = 5000) String cancellationWorkflow,
        @Size(max = 5000) String negotiationWorkflow,
        @NotNull @Valid ContractTermRequest contractTerm,
        @Valid List<NotificationScheduleRequest> notificationSchedules
) {

    public record ContractTermRequest(
            @NotNull BillingFrequency billingFrequency,
            @NotNull @DecimalMin("0.00") BigDecimal amount,
            @NotBlank @Size(min = 3, max = 3) String currency,
            LocalDate trialEndDate,
            @NotNull LocalDate renewalDate,
            @NotNull @Min(0) @Max(365) Integer cancellationDeadlineDays,
            @NotNull Boolean autoRenew,
            LocalDate contractEndDate,
            @NotNull Boolean isRefundable
    ) {
    }

    public record NotificationScheduleRequest(
            @NotNull @Min(1) @Max(365) Integer daysBeforeEvent,
            @NotNull NotificationEventType eventType,
            @NotNull Boolean enabled
    ) {
    }
}
