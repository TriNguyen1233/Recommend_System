package com.example.ecommerce.mapper;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.example.ecommerce.entity.Cart;
import com.example.ecommerce.entity.Order;
import com.example.ecommerce.entity.OrderItem;
import com.example.ecommerce.enums.OrderStatus;

@Component
public class CartMapper {

    public Order cartToOrder(Cart cart) {
        if (cart == null) {
            return null;
        }

        Order order = new Order();
        
        order.setUser(cart.getUser());
        order.setTotalPrice(cart.getTotalPrice());
        
        order.setStatus(OrderStatus.PENDING);
        order.setCreatedAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());

        if (cart.getCartItems() != null) {
            List<OrderItem> orderItems = cart.getCartItems().stream()
                .map(cartItem -> {
                    OrderItem orderItem = new OrderItem();
                    orderItem.setProduct(cartItem.getProduct());
                    orderItem.setQuantity(cartItem.getQuantity());
                    orderItem.setPrice(cartItem.getPrice());
                    
                    orderItem.setOrder(order); 
                    return orderItem;
                })
                .collect(Collectors.toList());
            
            order.setOrderItemList(orderItems);
        }

        return order;
    }
}