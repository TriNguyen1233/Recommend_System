package com.example.ecommerce.implement;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.ecommerce.entity.Product;
import com.example.ecommerce.entity.Review;
import com.example.ecommerce.entity.User;
import com.example.ecommerce.repository.ProductRepository;
import com.example.ecommerce.repository.ReviewRepository;
import com.example.ecommerce.repository.UserRepository;
import com.example.ecommerce.request.ReviewRequest;
import com.example.ecommerce.request.ReviewUpdateRequest;
import com.example.ecommerce.response.ReviewResponse;
import com.example.ecommerce.service.ReviewService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class ReviewServiceImp implements ReviewService {

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Override
    public ReviewResponse createReview(ReviewRequest request) {
        // 1. Lấy Product trực tiếp (không dùng Optional)
        Product product = productRepository.findByAsin(request.getProductAsin());
        if (product == null) {
            throw new RuntimeException("Product not found with ASIN: " + request.getProductAsin());
        }

        // 2. Kiểm tra User có tồn tại không
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + request.getUserId()));

        // 3. Map từ DTO sang Entity Review
        Review review = new Review();
        review.setProduct(product);
        review.setUser(user);
        review.setRating(request.getRating());
        review.setContent(request.getContent());

        // 4. Lưu vào Database
        Review savedReview = reviewRepository.save(review);

        // 5. Trả về DTO Response
        return mapToResponse(savedReview);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReviewResponse> getReviewsByProductAsin(String productAsin) {
        List<Review> reviews = reviewRepository.findByProductAsin(productAsin);

        return reviews.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ReviewResponse getReviewById(Integer id) {
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Review not found with ID: " + id));

        return mapToResponse(review);
    }

    @Override
    public ReviewResponse updateReview(Integer id, ReviewUpdateRequest request) {
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Review not found with ID: " + id));

        review.setRating(request.getRating());
        review.setContent(request.getContent());

        Review updatedReview = reviewRepository.save(review);
        return mapToResponse(updatedReview);
    }

    @Override
    public void deleteReview(Integer id) {
        if (!reviewRepository.existsById(id)) {
            throw new RuntimeException("Review not found with ID: " + id);
        }
        reviewRepository.deleteById(id);
    }

    /**
     * Helper method chuyển đổi từ Entity Review sang ReviewResponse DTO
     */
    private ReviewResponse mapToResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .userId(review.getUser() != null ? review.getUser().getId() : null)
                .userName(review.getUser() != null ? review.getUser().getUsername() : null)
                .rating(review.getRating())
                .content(review.getContent())
                .productAsin(review.getProduct() != null ? review.getProduct().getAsin() : null)
                .build();
    }
}