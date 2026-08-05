package com.example.ecommerce.entity;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.example.ecommerce.enums.ProductStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

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
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "products")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Product {

    @Id
    @Column(name = "parent_asin", length = 20)
    @NotBlank(message = "ASIN cannot be blank")
    @Size(max = 20, message = "ASIN length must not exceed 20 characters")
    private String asin;

    @NotBlank(message = "Title cannot be blank")
    @Column(name = "title", nullable = false, length = 500)
    private String title;

    @NotBlank(message = "Description cannot be blank")
    @Column(name = "description", columnDefinition = "TEXT", nullable = false)
    private String description;

    // Sử dụng float theo nhu cầu của bạn, đi kèm validation không âm
    @Column(name = "price", nullable = false)
    @PositiveOrZero(message = "Price must be greater than or equal to 0")
    private BigDecimal price;

    @Column(name = "image_url") // Mặc định nullable = true
    private String image;

    @Column(name = "stock_quantity", nullable = false)
    @PositiveOrZero(message = "Stock quantity cannot be negative")
    private int stockQuantity = 0;

    @Column(name = "sold_quantity", nullable = false)
    @PositiveOrZero(message = "Sold quantity cannot be negative")
    private int soldQuantity = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @NotNull(message = "Product status is required")
    private ProductStatus status = ProductStatus.ACTIVE;

    @Column(name = "category")
    private String category;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Review> reviews = new ArrayList<>();

    @Column(name = "embedding", columnDefinition = "vector(768)")
    @JdbcTypeCode(SqlTypes.VECTOR)
    private float[] embedding;
}