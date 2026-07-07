package com.example.ecommerce.entity;

import java.math.BigDecimal; // Import BigDecimal cho giá tiền
import java.util.List;

import com.example.ecommerce.enums.ProductStatus;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "products") // Đặt tên bảng rõ ràng
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Product {

    @Id
    @Column(name = "parent_asin", length = 20) // Mã ASIN của Amazon thường cố định độ dài ngắn
    private String asin;

    @NotBlank(message = "title can't be blank")
    @Column(name = "title", nullable = false, length = 500) // Tên sản phẩm Amazon thường khá dài
    private String title;

    @NotBlank(message = "description can't be blank")
    @Column(name = "description", columnDefinition = "TEXT") // Ép kiểu thành TEXT trong DB để chứa chuỗi siêu dài
    private String description;

    @Column(nullable = false)
    private BigDecimal price; // Đổi sang BigDecimal để tính toán tiền nong chính xác không bị lệch xu nào

    @Column(name = "image_url") // Lưu link ảnh
    private String image;

    @Column(name = "stock_quantity", nullable = false)
    private int stockQuantity = 0; // Gán mặc định bằng 0 cho an toàn

    @Column(name = "sold_quantity", nullable = false)
    private int soldQuantity = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProductStatus status;

    @Column(name="category")
    private String category;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Review> reviews;
    @Column(name = "embedding", columnDefinition = "float[]") // Lưu mảng float vào cột embedding
    private float[] embedding;
}