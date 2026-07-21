package com.example.ecommerce.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "CartItem")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class CartItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cart_item_id")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cart_id", referencedColumnName = "cart_id", nullable = false)
    @NotNull(message = "Cart item must belong to a cart")
    private Cart cart;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asin", referencedColumnName = "parent_asin", nullable = false)
    @NotNull(message = "Product is required")
    private Product product;

    @Column(name = "created_at", updatable = false, nullable = false)
    @NotNull(message = "Creation time cannot be null")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "price", nullable = false)
    @PositiveOrZero(message = "Price must be greater than or equal to 0")
    private float price;

    @Column(name = "discount", nullable = true)
    @PositiveOrZero(message = "Discount must be greater than or equal to 0")
    private Float discount;

    @Column(name = "quantity", nullable = false) // Thêm dấu phẩy hợp lệ
    @NotNull(message = "Quantity cannot be null") // Đảm bảo số lượng luôn có giá trị
    @Min(value = 1, message = "Quantity must be at least 1") // Ràng buộc số lượng sản phẩm trong giỏ tối thiểu là 1
    private int quantity;
}