package com.example.ecommerce.dto;

import com.example.ecommerce.enums.ProductStatus;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ProductResponse {
    private String asin;
    private String title;
    private String description;
    private float price;
    private String image;
    private ProductStatus status;
    private String category;
}