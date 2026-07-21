package com.example.ecommerce.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "reviews")
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "review_id") // Nên đặt tên cột rõ ràng trong DB
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asin", referencedColumnName = "parent_asin", nullable = false)
    @NotNull(message = "Product reference is required")
    private Product product;

    @Column(name = "user_id", nullable = false)
    @NotBlank(message = "User ID cannot be blank")
    private String userId;

    @Column(name = "rating", nullable = false)
    @Min(value = 1, message = "Rating must be at least 1 star")
    @Max(value = 5, message = "Rating cannot exceed 5 stars")
    private int rating;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    @NotBlank(message = "Review content cannot be blank") // Sửa từ description thành content
    private String content;
}