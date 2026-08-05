package com.example.ecommerce.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.example.ecommerce.enums.RequirementStatus;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RequirementStatusDTO {

    @NotNull(message = "Status is required")
    private RequirementStatus status;

    private String adminNote;
}