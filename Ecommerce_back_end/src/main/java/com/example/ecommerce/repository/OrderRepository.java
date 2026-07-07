package com.example.ecommerce.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.ecommerce.entity.Order;
import com.example.ecommerce.enums.OrderStatus;

public interface OrderRepository extends JpaRepository<Order, Integer> {
    List<Order> findByUserIdAndStatus(Long userId, OrderStatus status);
}
