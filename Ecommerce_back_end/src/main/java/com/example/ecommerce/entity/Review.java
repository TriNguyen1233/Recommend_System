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
    private Integer id;

    // SỬA LỖI: Dùng @ManyToOne cho thực thể Product thay vì @Column
    // Thêm @NotNull để đảm bảo review phải thuộc về một sản phẩm nào đó
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asin", referencedColumnName = "parent_asin", nullable = false)
    @NotNull(message = "Sản phẩm đánh giá không được để trống")
    private Product product;

    // SỬA LỖI: Bỏ @JoinColumn ở đây vì userId chỉ là một String thuần túy, không phải một Entity mối quan hệ
    @Column(name = "user_id", nullable = false)
    @NotBlank(message = "ID người dùng không được để trống")
    private String userId;

    // Thêm CONSTRAINT: Rating thường nằm trong khoảng từ 1 đến 5 sao
    @Column(name = "rating", nullable = false)
    @Min(value = 1, message = "1 star is the minimum rating")
    @Max(value = 5, message = "5 star is the maximum rating")
    private int rating;

    // Thêm CONSTRAINT: Nội dung đánh giá không được trống và giới hạn độ dài ký tự
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    @NotBlank(message = "description can't be blank")
    private String content;
}