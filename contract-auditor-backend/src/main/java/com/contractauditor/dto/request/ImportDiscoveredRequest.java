package com.contractauditor.dto.request;

import com.contractauditor.domain.enums.BillingFrequency;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record ImportDiscoveredRequest(
        @NotEmpty @Valid List<ImportDiscoveredItem> suggestions
) {

    public record ImportDiscoveredItem(
            @NotBlank @Size(max = 50) String vendorKey,
            @NotBlank @Size(max = 255) String name,
            @NotBlank @Size(max = 255) String provider,
            @NotBlank @Size(max = 100) String category,
            @NotNull @DecimalMin("0.00") BigDecimal amount,
            @NotBlank @Size(min = 3, max = 3) String currency,
            @NotNull BillingFrequency billingFrequency,
            @NotNull LocalDate renewalDate
    ) {
    }
}
