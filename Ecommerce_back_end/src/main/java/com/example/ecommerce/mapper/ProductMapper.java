package com.example.ecommerce.mapper;

import com.example.ecommerce.dto.ProductResponse;
import com.example.ecommerce.entity.Product; // Giả sử package entity của bạn ở đây

public class ProductMapper {
    
    // Chuyển từ Entity (Product) sang Response DTO (ProductResponse)
    public static ProductResponse toProductResponse(Product product) {
        if (product == null) {
            return null;
        }

        ProductResponse response = new ProductResponse();
        response.setAsin(product.getAsin());
        response.setTitle(product.getTitle());
        response.setDescription(product.getDescription());
        response.setPrice(product.getPrice());
        response.setImage(product.getImage());
        response.setStatus(product.getStatus());
        
        if (product.getCategory() != null) {
            response.setCategory(product.getCategory()); 
        }

        return response;
    }

    // Ngược lại, nếu bạn cần chuyển từ Request/Response sang Entity để lưu xuống DB
    public static Product toProduct(ProductResponse response) {
        if (response == null) {
            return null;
        }

        Product product = new Product();
        product.setAsin(response.getAsin());
        product.setTitle(response.getTitle());
        product.setDescription(response.getDescription());
        product.setPrice(response.getPrice());
        product.setImage(response.getImage());
        product.setStatus(response.getStatus());
        
        return product;
    }
}