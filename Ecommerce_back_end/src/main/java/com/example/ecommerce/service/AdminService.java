package com.example.ecommerce.service;

import java.util.List;

import com.example.ecommerce.entity.User;
import com.example.ecommerce.enums.UserRole;
import com.example.ecommerce.enums.UserStatus;

public interface AdminService {

    User createUser(User user);

    User updateUser(String id, User user);

    void deleteUser(String id);

    User getUserById(String id);

    User getUserByEmail(String email);

    List<User> getAllUsers();

    // Phương thức mới: Lấy danh sách người dùng theo Role (vd: Role.USER)
    List<User> getUsersByRole(UserRole role);

    User changeUserStatus(String id, UserStatus status);
}