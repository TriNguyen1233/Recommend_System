package com.example.ecommerce.request;

import com.example.ecommerce.enums.RequirementType;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class RequirementRequest {
    private String userId;
    private String title;
    private String description;
    private BigDecimal budget;
    private RequirementType type;
}