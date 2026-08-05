package com.example.ecommerce.service;

import java.util.Map;

import com.example.ecommerce.entity.User;
import com.example.ecommerce.request.LoginRequest;
import com.example.ecommerce.request.SignupRequest;
import com.example.ecommerce.response.UserResponse;

public interface UserService {

    /**
     * Kiểm tra xem người dùng có phải là Admin hay không dựa trên userId.
     */
    boolean isAdmin(String userId);

    /**
     * Xác thực thông tin đăng nhập của người dùng.
     * 
     * @param loginRequest DTO chứa email và password
     * @return UserResponse chứa thông tin user an toàn (không kèm mật khẩu)
     */
    UserResponse login(LoginRequest loginRequest);

    /**
     * Đăng ký tài khoản người dùng mới vào hệ thống.
     * 
     * @param signupRequest DTO chứa đầy đủ thông tin đăng ký từ client
     * @return true nếu đăng ký thành công
     */
    boolean signup(SignupRequest signupRequest);

    /**
     * Yêu cầu khôi phục mật khẩu qua Email.
     */
    boolean forgetPassword(String email);

    User processFirebaseUser(String uid, String email, String name, String picture);

    void updateAvatar(String id, String avatarUrl);

    UserResponse updateUser(String id, Map<String, Object> updates);

}