package com.example.ecommerce.mapper;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import org.springframework.stereotype.Component;

import com.example.ecommerce.entity.Cart;
import com.example.ecommerce.entity.CartItem;
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
        order.setStatus(OrderStatus.PENDING);

        // Tạo mốc thời gian dùng chung cho cả Order và các OrderItem
        LocalDateTime now = LocalDateTime.now();
        order.setCreatedAt(now);
        order.setUpdatedAt(now);

        List<OrderItem> orderItems = mapCartItemsToOrderItems(cart.getCartItems(), order, now);
        order.setOrderItemList(orderItems);

        order.setTotalPrice(calculateTotalPrice(orderItems));

        return order;
    }

    private List<OrderItem> mapCartItemsToOrderItems(List<CartItem> cartItems, Order order, LocalDateTime now) {
        if (cartItems == null || cartItems.isEmpty()) {
            return Collections.emptyList();
        }

        return cartItems.stream()
                .map(cartItem -> {
                    OrderItem orderItem = new OrderItem();
                    orderItem.setProduct(cartItem.getProduct());
                    orderItem.setQuantity(cartItem.getQuantity());
                    orderItem.setPrice(cartItem.getPrice());
                    orderItem.setOrder(order);

                    // Bổ sung mốc thời gian để thỏa mãn constraint @NotNull trong OrderItem
                    orderItem.setCreatedAt(now);
                    orderItem.setUpdatedAt(now);

                    return orderItem;
                })
                .toList();
    }

    private BigDecimal calculateTotalPrice(List<OrderItem> orderItems) {

        if (orderItems == null || orderItems.isEmpty()) {
            return BigDecimal.ZERO;
        }

        BigDecimal total = BigDecimal.ZERO;

        for (OrderItem item : orderItems) {

            if (item == null) {
                continue;
            }

            BigDecimal price = item.getPrice() == null
                    ? BigDecimal.ZERO
                    : item.getPrice();

            Integer quantity = item.getQuantity() == null
                    ? 0
                    : item.getQuantity();

            BigDecimal subTotal = price.multiply(BigDecimal.valueOf(quantity));

            System.out.println(
                    "Price = " + price +
                            ", Qty = " + quantity +
                            ", SubTotal = " + subTotal);

            total = total.add(subTotal);
        }

        System.out.println("TOTAL = " + total);

        return total;
    }
}