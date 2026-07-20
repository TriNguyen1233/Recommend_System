package com.example.ecommerce.service;

import java.util.List;

import com.example.ecommerce.entity.Order;
import com.example.ecommerce.enums.OrderStatus;

public interface OrderService {
    List<Order> findOrderByUserId(String id);

    List<Order> findOrderByUserIdAndStatus(String id, OrderStatus orderStatus);

    Order cartToOrder(String id);

    Order changeOrderStatus(Integer orderId, OrderStatus orderStatus);
}
