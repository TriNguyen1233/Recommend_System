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
@Table(name = "wishlist_items")
public class WishListItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "wishlistitem_id")
    private Integer wishListItemId; // Đổi sang Integer để đồng bộ hệ thống

    // Nên thêm fetch = FetchType.LAZY để tối ưu hóa hiệu năng, tránh câu lệnh select thừa
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wishlist_id", nullable = false)
    @NotNull(message = "Wishlist reference is required")
    private Wishlist wishlist;

    @Column(name = "added_at", nullable = false, updatable = false)
    @NotNull(message = "Added time cannot be null")
    private LocalDateTime addedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asin", referencedColumnName = "parent_asin", nullable = false)
    @NotNull(message = "Product is required")
    private Product product;
}