package com.example.ecommerce.request;

import java.math.BigDecimal;

import com.example.ecommerce.enums.ProductStatus;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductRequest {

    @NotBlank(message = "ASIN cannot be blank")
    @Size(max = 20, message = "ASIN length must not exceed 20 characters")
    private String asin;

    @NotBlank(message = "Title cannot be blank")
    @Size(max = 500, message = "Title length must not exceed 500 characters")
    private String title;

    @NotBlank(message = "Description cannot be blank")
    private String description;

    @PositiveOrZero(message = "Price must be greater than or equal to 0")
    private BigDecimal price;

    private String image;

    @PositiveOrZero(message = "Stock quantity cannot be negative")
    private int stockQuantity;

    @NotNull(message = "Product status is required")
    private ProductStatus status;

    private String category;
    
    private float[] embedding;
}