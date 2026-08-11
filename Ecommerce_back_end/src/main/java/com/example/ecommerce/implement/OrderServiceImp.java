package com.example.ecommerce.implement;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.ecommerce.entity.Cart;
import com.example.ecommerce.entity.Order;
import com.example.ecommerce.enums.CartStatus;
import com.example.ecommerce.enums.OrderStatus;
import com.example.ecommerce.mapper.CartMapper;
import com.example.ecommerce.repository.CartRepository;
import com.example.ecommerce.repository.OrderRepository;
import com.example.ecommerce.service.OrderService;

@Service
public class OrderServiceImp implements OrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private CartMapper cartMapper;

    @Override
    public List<Order> findAllOrders() {
        try {
            return orderRepository.findAll();
        } catch (Exception e) {
            throw new RuntimeException("Failed to retrieve all orders", e);
        }
    }

    @Override
    public List<Order> findOrderByUserId(String id) {
        try {
            if (id == null || id.isBlank()) {
                throw new IllegalArgumentException(
                        "User ID cannot be null or empty");
            }

            return orderRepository.findByUserId(id);

        } catch (IllegalArgumentException e) {
            throw e;

        } catch (Exception e) {
            throw new RuntimeException(
                    "Failed to find orders for user: " + id,
                    e);
        }
    }

    @Override
    public List<Order> findOrderByUserIdAndStatus(
            String id,
            OrderStatus orderStatus) {

        try {
            if (id == null || id.isBlank()) {
                throw new IllegalArgumentException(
                        "User ID cannot be null or empty");
            }

            if (orderStatus == null) {
                throw new IllegalArgumentException(
                        "Order status cannot be null");
            }

            return orderRepository.findByUserIdAndStatus(
                    id,
                    orderStatus);

        } catch (IllegalArgumentException e) {
            throw e;

        } catch (Exception e) {
            throw new RuntimeException(
                    "Failed to find orders for user: " + id,
                    e);
        }
    }

    @Override
    @Transactional
    public Order cartToOrder(String id) {

        try {

            if (id == null || id.isBlank()) {
                throw new IllegalArgumentException(
                        "User ID cannot be null or empty");
            }

            Optional<Cart> cartOptional = cartRepository.findByUserIdAndStatus(
                    id,
                    CartStatus.ACTIVE);

            Cart cart = cartOptional.orElseThrow(
                    () -> new RuntimeException(
                            "Active cart not found for user: " + id));

            if (cart.getCartItems() == null
                    || cart.getCartItems().isEmpty()) {

                throw new IllegalStateException(
                        "Cannot create order from an empty cart");
            }

            Order order = cartMapper.cartToOrder(cart);

            if (order == null) {
                throw new RuntimeException(
                        "Failed to convert cart to order");
            }

            System.out.println("Before save: " + order.getTotalPrice());

            Order savedOrder = orderRepository.save(order);

            System.out.println("After save: " + savedOrder.getTotalPrice());

            cart.setStatus(CartStatus.COMPLETED);
            cart.setUpdatedAt(LocalDateTime.now());
            cartRepository.save(cart);

            Cart newCart = new Cart();
            newCart.setUser(cart.getUser());
            newCart.setStatus(CartStatus.ACTIVE);
            newCart.setCartItems(new ArrayList<>());
            newCart.setTotalPrice(BigDecimal.ZERO);
            newCart.setCreatedAt(LocalDateTime.now());
            newCart.setUpdatedAt(LocalDateTime.now());

            cartRepository.save(newCart);

            return savedOrder;

        } catch (IllegalArgumentException e) {
            throw e;

        } catch (IllegalStateException e) {
            throw e;

        } catch (Exception e) {
            throw new RuntimeException(
                    "Failed to create order from cart for user: " + id,
                    e);
        }
    }

    @Override
    @Transactional
    public Order changeOrderStatus(
            Integer orderId,
            OrderStatus orderStatus) {

        try {

            if (orderId == null || orderId <= 0) {
                throw new IllegalArgumentException(
                        "Invalid order ID: " + orderId);
            }

            if (orderStatus == null) {
                throw new IllegalArgumentException(
                        "Order status cannot be null");
            }

            Order order = orderRepository.findById(orderId)
                    .orElseThrow(
                            () -> new RuntimeException(
                                    "Order not found: " + orderId));

            order.setStatus(orderStatus);

            return orderRepository.save(order);

        } catch (IllegalArgumentException e) {

            throw e;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Failed to change order status for order: "
                            + orderId,
                    e);
        }
    }
}