package com.example.ecommerce.recommendSystem;

public interface ProductVectorProjection {
    String getParentAsin();
    String getTitle();
    Double getPrice();
    String getMainCategory();
    String getCategory();
    String getImageUrl();
    String getStore();
    Double getCosineSimilarity(); // Cột tính toán 1 - (embedding_vector <=> ...)
}