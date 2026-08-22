package com.contractauditor.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record RecordRenewalRequest(
        @NotNull @DecimalMin("0.00") BigDecimal previousAmount,
        @NotNull @DecimalMin("0.00") BigDecimal newAmount,
        @NotNull LocalDate renewalDate,
        @Size(max = 2000) String notes
) {
}
