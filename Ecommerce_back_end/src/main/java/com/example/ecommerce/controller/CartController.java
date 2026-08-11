package com.example.ecommerce.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.ecommerce.entity.Cart;
import com.example.ecommerce.service.CartService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping
    public ResponseEntity<Cart> getCart(@RequestParam String userId) {
        Cart cart = cartService.getCartByUserId(userId);
        return ResponseEntity.ok(cart);
    }

    @GetMapping("/count")
    public ResponseEntity<Integer> getItemNumber(@RequestParam String userId) {
        int itemNumber = cartService.getItemNumber(userId);
        return ResponseEntity.ok(itemNumber);
    }

    @PostMapping("/add")
    public ResponseEntity<Cart> addProductToCart(
            @RequestParam String userId,
            @RequestParam String asin,
            @RequestParam(defaultValue = "1") int quantity) {
        Cart updatedCart = cartService.addProductToCart(userId, asin, quantity);
        return ResponseEntity.ok(updatedCart);
    }

    @PutMapping("/update")
    public ResponseEntity<Cart> updateProductQuantity(
            @RequestParam String userId,
            @RequestParam String asin,
            @RequestParam int quantity) {
        Cart updatedCart = cartService.updateProductQuantity(userId, asin, quantity);
        return ResponseEntity.ok(updatedCart);
    }

    // FIX: Đổi từ {asin} (String) thành {cartItemId} (int)
    @DeleteMapping("/remove/{cartItemId}")
    public ResponseEntity<Cart> removeProductFromCart(
            @RequestParam String userId,
            @PathVariable int cartItemId) {
        Cart updatedCart = cartService.removeProductFromCart(userId, cartItemId);
        return ResponseEntity.ok(updatedCart);
    }

    @DeleteMapping("/clear")
    public ResponseEntity<Void> clearCart(@RequestParam String userId) {
        cartService.clearCart(userId);
        return ResponseEntity.noContent().build();
    }
}