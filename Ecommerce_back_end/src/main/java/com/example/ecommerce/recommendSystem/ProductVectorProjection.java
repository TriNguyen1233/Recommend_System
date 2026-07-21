package com.example.ecommerce.recommendSystem;

public interface ProductVectorProjection {
    String getParentAsin();
    String getTitle();
    Float getPrice();
    String getCategory();
    String getImageUrl();
    Float getCosineSimilarity();
}