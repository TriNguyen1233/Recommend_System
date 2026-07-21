package com.example.ecommerce.service;

import java.util.List;

import com.example.ecommerce.entity.User;
import com.example.ecommerce.enums.UserStatus;

public interface AdminService {

    /**
     * Tạo mới một người dùng vào hệ thống.
     */
    User createUser(User user);

    /**
     * Cập nhật thông tin của người dùng dựa trên ID.
     */
    User updateUser(String id, User user);

    /**
     * Xóa một người dùng ra khỏi hệ thống dựa trên ID.
     */
    void deleteUser(String id);

    /**
     * Lấy thông tin chi tiết của người dùng bằng ID.
     */
    User getUserById(String id);

    /**
     * Tìm kiếm người dùng trong hệ thống dựa trên Email.
     */
    User getUserByEmail(String email);

    /**
     * Lấy danh sách toàn bộ người dùng hiện có.
     */
    List<User> getAllUsers();

    /**
     * Thay đổi trạng thái hoạt động (Status) của người dùng qua Email.
     */
    User changeUserStatus(String email, UserStatus status);
}