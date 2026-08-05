package com.example.ecommerce.service;

import com.example.ecommerce.entity.Cart;

public interface CartService {

    /**
     * Lấy thông tin giỏ hàng của người dùng dựa trên userId.
     * Nếu chưa có giỏ hàng, hệ thống sẽ tự động tạo mới một giỏ trống.
     */
    Cart getCartByUserId(String userId);

    /**
     * Thêm một sản phẩm vào giỏ hàng (hoặc tăng số lượng nếu sản phẩm đã tồn tại).
     * 
     * @param quantity Số lượng muốn thêm
     */
    Cart addProductToCart(String userId, String asin, int quantity);

    /**
     * Cập nhật chính xác số lượng của một sản phẩm trong giỏ hàng.
     * 
     * @param quantity Số lượng mới thiết lập
     */
    Cart updateProductQuantity(String userId, String asin, int quantity);

    /**
     * Xóa hoàn toàn một sản phẩm ra khỏi giỏ hàng.
     */
    // Cart removeProductFromCart(String userId, String asin);

    /**
     * Xóa sạch toàn bộ sản phẩm trong giỏ (thường dùng sau khi đặt hàng thành
     * công).
     */
    Cart removeProductFromCart(String userId, int cartItemId);

    void clearCart(String userId);

    int getItemNumber(String userId);
}