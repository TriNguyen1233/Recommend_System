package com.example.ecommerce.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "wishlists")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Wishlist {

    @Id
    @Column(name = "wishlist_id")
    @NotBlank(message = "Wishlist ID cannot be blank")
    private String wishlistId;

    @Column(name = "user_id", nullable = false)
    @NotBlank(message = "User ID cannot be blank")
    private String userId;

    @Column(name = "created_at", updatable = false, nullable = false)
    @NotNull(message = "Creation time cannot be null")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "wishlist", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<WishListItem> wishlistItems = new ArrayList<>(); // Khởi tạo sẵn danh sách trống
}