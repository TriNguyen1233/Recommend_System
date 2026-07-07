package com.example.ecommerce.entity;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "wishlists")
@NoArgsConstructor
@AllArgsConstructor
public class Wishlist {

    @Id
    @Column(name = "wishlist_id")
    private String wishlistId; // Định dạng String theo đúng sơ đồ

    // Định danh người dùng sở hữu danh sách yêu thích này
    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Bổ sung mối quan hệ 1-N: Một wishlist chứa nhiều item sản phẩm yêu thích
    // (mappedBy sẽ trỏ đến biến 'wishlist' nằm trong entity WishlistItem)
    @OneToMany(mappedBy = "wishlist", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<WishListItem> wishlistItems; 
}