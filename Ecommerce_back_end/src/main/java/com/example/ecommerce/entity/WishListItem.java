package com.example.ecommerce.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "wishlist_items") // Maps this class to your database table
public class WishListItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // Automatically increments the ID
    @Column(name = "wishlistitem_id")
    private int wishListItemId; // Changed to camelCase

    @ManyToOne
    @JoinColumn(name = "wishlist_id", nullable = false) // Defines the foreign key relationship
    private Wishlist wishlist;

    @Column(name = "added_at")
    private LocalDateTime addedAt;

    @ManyToOne
    @JoinColumn(name = "asin", referencedColumnName = "parent_asin", nullable = false)
    private Product product;
}