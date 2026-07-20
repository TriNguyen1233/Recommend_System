package com.example.ecommerce.implement;

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
    public List<Order> findOrderByUserId(String id) {
        return orderRepository.findByUserId(id);
    }

    @Override
    public List<Order> findOrderByUserIdAndStatus(String id, OrderStatus orderStatus) {
        return orderRepository.findByUserIdAndStatus(id, orderStatus);
    }

    @Override
    @Transactional
    public Order cartToOrder(String id) {
        // Lấy giỏ hàng active của user
        Optional<Cart> cartOptional = cartRepository.findByUserIdAndStatus(id, CartStatus.ACTIVE);
        Cart cart = cartOptional.orElseThrow(() -> new RuntimeException("cart not found!"));
        
        Order order = cartMapper.cartToOrder(cart);
        
        Order savedOrder = orderRepository.save(order);
        
        cart.setStatus(CartStatus.COMPLETED); 
        cartRepository.save(cart);
        
        return savedOrder;
    }

    @Override
    @Transactional
    public Order changeOrderStatus(Integer orderId, OrderStatus orderStatus) { 
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("cart not found: " + orderId));
        
        order.setStatus(orderStatus);
        return orderRepository.save(order);
    }
}