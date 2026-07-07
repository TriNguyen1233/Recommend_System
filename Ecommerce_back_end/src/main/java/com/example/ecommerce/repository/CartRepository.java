package com.example.ecommerce.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.ecommerce.entity.Cart;
import com.example.ecommerce.enums.CartStatus;

public interface CartRepository extends JpaRepository<Cart, Integer> {
    List<Cart> findByUserIdAndStatus(Long userId, CartStatus status);
    
}
