package com.example.ecommerce.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.ecommerce.entity.Order;
import com.example.ecommerce.enums.OrderStatus;

@Repository
public interface OrderRepository extends JpaRepository<Order, Integer> {
    List<Order> findByUserIdAndStatus(String userId, OrderStatus status);
    
    List<Order> findByUserId(String userId);
}
