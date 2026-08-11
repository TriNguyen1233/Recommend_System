package com.example.ecommerce.implement;

import java.time.LocalDateTime;
import java.util.ArrayList;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.ecommerce.entity.Cart;
import com.example.ecommerce.entity.CartItem;
import com.example.ecommerce.entity.Product;
import com.example.ecommerce.entity.User;
import com.example.ecommerce.enums.CartStatus;
import com.example.ecommerce.repository.CartRepository;
import com.example.ecommerce.repository.ProductRepository;
import com.example.ecommerce.repository.UserRepository;
import com.example.ecommerce.service.CartService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CartServiceImp implements CartService {

    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public Cart getCartByUserId(String userId) {

        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException("User ID cannot be null or empty");
        }

        return cartRepository.findByUserIdAndStatus(userId, CartStatus.ACTIVE)
                .orElseGet(() -> {

                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new RuntimeException(
                                    "User not found with id: " + userId));

                    Cart newCart = new Cart();

                    newCart.setUser(user);
                    newCart.setCartItems(new ArrayList<>());
                    newCart.setStatus(CartStatus.ACTIVE);
                    newCart.setCreatedAt(LocalDateTime.now());
                    newCart.setUpdatedAt(LocalDateTime.now());

                    return cartRepository.save(newCart);
                });
    }

    @Override
    @Transactional
    public Cart addProductToCart(
            String userId,
            String asin,
            int quantity) {

        if (quantity <= 0) {
            throw new IllegalArgumentException(
                    "Quantity must be greater than 0");
        }

        Cart cart = getCartByUserId(userId);

        Product product = productRepository.findByAsin(asin);

        if (product == null) {
            throw new RuntimeException(
                    "Product not found with ASIN: " + asin);
        }

        CartItem existingItem = cart.getCartItems()
                .stream()
                .filter(item -> item.getProduct() != null &&
                        item.getProduct().getAsin().equals(asin))
                .findFirst()
                .orElse(null);

        if (existingItem != null) {

            existingItem.setQuantity(
                    existingItem.getQuantity() + quantity);

        } else {

            CartItem newItem = new CartItem();

            newItem.setProduct(product);
            newItem.setQuantity(quantity);
            newItem.setCart(cart);
            newItem.setCreatedAt(LocalDateTime.now());
            newItem.setPrice(product.getPrice());
            cart.getCartItems().add(newItem);
        }

        cart.setUpdatedAt(LocalDateTime.now());

        return cartRepository.save(cart);
    }

    @Override
    @Transactional
    public Cart updateProductQuantity(
            String userId,
            String asin,
            int quantity) {

        Cart cart = getCartByUserId(userId);

        CartItem targetItem = cart.getCartItems()
                .stream()
                .filter(item -> item.getProduct() != null &&
                        item.getProduct().getAsin().equals(asin))
                .findFirst()
                .orElseThrow(() -> new RuntimeException(
                        "Product not found in your cart: " + asin));

        // Nếu số lượng <= 0, xóa item dựa trên cartItemId của nó
        if (quantity <= 0) {
            return removeProductFromCart(userId, targetItem.getId());
        }

        targetItem.setQuantity(quantity);

        cart.setUpdatedAt(LocalDateTime.now());

        return cartRepository.save(cart);
    }

    @Override
    @Transactional
    public Cart removeProductFromCart(String userId, int cartItemId) {

        Cart cart = getCartByUserId(userId);

        boolean removed = cart.getCartItems()
                .removeIf(item -> item.getId() != null && item.getId().equals(cartItemId));

        if (!removed) {
            throw new RuntimeException("Cart item not found with ID: " + cartItemId);
        }

        cart.setUpdatedAt(LocalDateTime.now());

        return cartRepository.save(cart);
    }

    @Override
    @Transactional
    public void clearCart(String userId) {

        Cart cart = getCartByUserId(userId);

        cart.getCartItems().clear();

        cart.setUpdatedAt(LocalDateTime.now());

        cartRepository.save(cart);
    }

    @Override
    @Transactional(readOnly = true)
    public int getItemNumber(String userId) {

        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException(
                    "User ID cannot be null or empty");
        }

        Cart cart = getCartByUserId(userId);

        if (cart.getCartItems() == null || cart.getCartItems().isEmpty()) {
            return 0;
        }

        return cart.getCartItems()
                .stream()
                .mapToInt(CartItem::getQuantity)
                .sum();
    }
}