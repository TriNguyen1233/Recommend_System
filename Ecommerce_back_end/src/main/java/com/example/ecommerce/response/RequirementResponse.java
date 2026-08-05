package com.example.ecommerce.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.example.ecommerce.entity.Requirement;
import com.example.ecommerce.enums.RequirementStatus;
import com.example.ecommerce.enums.RequirementType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RequirementResponse {

    private Long id;
    private String userId;
    private String title;
    private String description;
    private BigDecimal budget;
    private RequirementType type;
    private RequirementStatus status;
    private String adminNote;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Hàm convert nhanh từ Entity -> Response DTO
    public static RequirementResponse fromEntity(Requirement entity) {
        if (entity == null) {
            return null;
        }

        return RequirementResponse.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .budget(entity.getBudget())
                .type(entity.getType())
                .status(entity.getStatus())
                .adminNote(entity.getAdminNote())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
