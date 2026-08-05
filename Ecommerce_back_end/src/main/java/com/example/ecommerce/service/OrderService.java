package com.example.ecommerce.service;

import java.util.List;

import com.example.ecommerce.entity.Order;
import com.example.ecommerce.enums.OrderStatus;

public interface OrderService {

    /**
     * Lấy danh sách tất cả các đơn hàng trong hệ thống.
     */
    List<Order> findAllOrders();

    /**
     * Tìm danh sách đơn hàng theo User ID.
     */
    List<Order> findOrderByUserId(String id);

    /**
     * Tìm danh sách đơn hàng theo User ID và trạng thái đơn hàng.
     */
    List<Order> findOrderByUserIdAndStatus(String id, OrderStatus orderStatus);

    /**
     * Chuyển đổi giỏ hàng hiện tại thành đơn hàng mới.
     */
    Order cartToOrder(String id);

    /**
     * Cập nhật trạng thái của đơn hàng.
     */
    Order changeOrderStatus(Integer orderId, OrderStatus orderStatus);
}