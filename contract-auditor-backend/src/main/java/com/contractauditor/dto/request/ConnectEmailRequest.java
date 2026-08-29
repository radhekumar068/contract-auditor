package com.contractauditor.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ConnectEmailRequest(
        @NotBlank String code,
        @NotBlank String state
) {
}
