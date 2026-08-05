package com.example.ecommerce.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.ecommerce.entity.Order;
import com.example.ecommerce.enums.OrderStatus;
import com.example.ecommerce.service.OrderService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping("/checkout/{userId}")
    public ResponseEntity<Order> checkoutCart(@PathVariable String userId) {
        Order order = orderService.cartToOrder(userId);
        return new ResponseEntity<>(order, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<Order>> getAllOrders() {
        List<Order> orders = orderService.findAllOrders();
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Order>> getOrdersByUserId(@PathVariable String userId) {
        List<Order> orders = orderService.findOrderByUserId(userId);
        return ResponseEntity.ok(orders); 
    }

    @GetMapping("/user/{userId}/filter")
    public ResponseEntity<List<Order>> getOrdersByUserIdAndStatus(
            @PathVariable String userId, 
            @RequestParam OrderStatus status) {
        List<Order> orders = orderService.findOrderByUserIdAndStatus(userId, status);
        return ResponseEntity.ok(orders);
    }

    @PutMapping("/{orderId}/status")
    public ResponseEntity<Order> changeOrderStatus(
            @PathVariable Integer orderId, 
            @RequestParam OrderStatus status) {
        Order updatedOrder = orderService.changeOrderStatus(orderId, status);
        return ResponseEntity.ok(updatedOrder);
    }
}