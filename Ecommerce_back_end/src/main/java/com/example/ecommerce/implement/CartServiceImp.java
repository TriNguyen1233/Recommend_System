package com.example.ecommerce.implement;

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
@RequiredArgsConstructor // Tự động Inject các Repository thông qua Constructor của Lombok
public class CartServiceImp implements CartService {

    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public Cart getCartByUserId(String userId) {

        return cartRepository.findByUserIdAndStatus(userId, CartStatus.ACTIVE)
                .orElseGet(() -> {
                    Cart newCart = new Cart();
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

                    newCart.setUser(user);
                    newCart.setCartItems(new ArrayList<>());
                    newCart.setStatus(CartStatus.ACTIVE);
                    
                    return cartRepository.save(newCart);
                });
    }

    @Override
    @Transactional
    public Cart addProductToCart(String userId, String asin, int quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than 0");
        }

        Cart cart = getCartByUserId(userId);
        Product product = productRepository.findByAsin(asin);
        if (product == null) {
            throw new RuntimeException("Product not found with ASIN: " + asin);
        }

        CartItem existingItem = cart.getCartItems().stream()
                .filter(item -> item.getProduct().getAsin().equals(asin))
                .findFirst()
                .orElse(null);

        if (existingItem != null) {
            existingItem.setQuantity(existingItem.getQuantity() + quantity);
        } else {
            CartItem newItem = new CartItem();
            newItem.setProduct(product);
            newItem.setQuantity(quantity);
            newItem.setCart(cart);
            cart.getCartItems().add(newItem);
        }

        return cartRepository.save(cart);
    }

    @Override
    @Transactional
    public Cart updateProductQuantity(String userId, String asin, int quantity) {
        if (quantity <= 0) {
            return removeProductFromCart(userId, asin);
        }

        Cart cart = getCartByUserId(userId);
        
        CartItem targetItem = cart.getCartItems().stream()
                .filter(item -> item.getProduct().getAsin().equals(asin))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Product not found in your cart"));

        targetItem.setQuantity(quantity);

        return cartRepository.save(cart);
    }

    @Override
    @Transactional
    public Cart removeProductFromCart(String userId, String asin) {
        Cart cart = getCartByUserId(userId);
        
        boolean removed = cart.getCartItems().removeIf(item -> item.getProduct().getAsin().equals(asin));
        
        if (!removed) {
            throw new RuntimeException("Product not found in your cart");
        }

        return cartRepository.save(cart);
    }

    @Override
    @Transactional
    public void clearCart(String userId) {
        Cart cart = getCartByUserId(userId);
        cart.getCartItems().clear();
        cartRepository.save(cart);
    }
}