package com.example.ecommerce.service;

import java.util.List;

import com.example.ecommerce.response.ReviewResponse;
import com.example.ecommerce.request.ReviewRequest;
import com.example.ecommerce.request.ReviewUpdateRequest;

public interface ReviewService {

    /**
     * Creates a new review for a product.
     */
    ReviewResponse createReview(ReviewRequest request);

    /**
     * Fetches all reviews associated with a specific product ASIN.
     * Uses ReviewRepository.findByProductAsin under the hood.
     */
    List<ReviewResponse> getReviewsByProductAsin(String productAsin);

    /**
     * Retrieves a single review by its unique ID.
     */
    ReviewResponse getReviewById(Integer id);

    /**
     * Updates an existing review's rating or content.
     */
    ReviewResponse updateReview(Integer id, ReviewUpdateRequest request);

    /**
     * Deletes a review by its ID.
     */
    void deleteReview(Integer id);
}