package com.example.ecommerce.response;

import java.util.List;

import com.example.ecommerce.enums.ProductStatus;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponse {
    
    private String asin;
    private String title;
    private String description;
    private float price;
    private String image;
    private int stockQuantity;
    private int soldQuantity;
    private ProductStatus status;
    private String category;
    private float[] embedding;
    
    // Thay vì chứa List<Review> (Entity), ta chứa List DTO để an toàn dữ liệu
    private List<ReviewResponse> reviews; 
}