package com.example.ecommerce.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.ecommerce.request.ReviewRequest;
import com.example.ecommerce.response.ReviewResponse;
import com.example.ecommerce.service.ReviewService;
import com.example.ecommerce.request.ReviewUpdateRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    /**
     * Tạo mới một đánh giá
     * POST /api/reviews
     */
    @PostMapping
    public ResponseEntity<ReviewResponse> createReview(@Valid @RequestBody ReviewRequest request) {
        ReviewResponse createdReview = reviewService.createReview(request);
        return new ResponseEntity<>(createdReview, HttpStatus.CREATED);
    }

    /**
     * Lấy danh sách đánh giá theo Mã Sản phẩm (ASIN)
     * GET /api/reviews/product/{productAsin}
     */
    @GetMapping("/product/{productAsin}")
    public ResponseEntity<List<ReviewResponse>> getReviewsByProductAsin(@PathVariable String productAsin) {
        List<ReviewResponse> reviews = reviewService.getReviewsByProductAsin(productAsin);
        return ResponseEntity.ok(reviews);
    }

    /**
     * Lấy chi tiết một đánh giá theo Review ID
     * GET /api/reviews/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ReviewResponse> getReviewById(@PathVariable Integer id) {
        ReviewResponse review = reviewService.getReviewById(id);
        return ResponseEntity.ok(review);
    }

    /**
     * Cập nhật đánh giá theo Review ID
     * PUT /api/reviews/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<ReviewResponse> updateReview(
            @PathVariable Integer id,
            @Valid @RequestBody ReviewUpdateRequest request) {
        ReviewResponse updatedReview = reviewService.updateReview(id, request);
        return ResponseEntity.ok(updatedReview);
    }

    /**
     * Xóa đánh giá theo Review ID
     * DELETE /api/reviews/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReview(@PathVariable Integer id) {
        reviewService.deleteReview(id);
        return ResponseEntity.noContent().build();
    }
}