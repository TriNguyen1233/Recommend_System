package com.example.ecommerce.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.ecommerce.entity.User;
import com.example.ecommerce.enums.UserRole;
import com.example.ecommerce.enums.UserStatus;
import com.example.ecommerce.mapper.UserMapper;
import com.example.ecommerce.request.UserRequest;
import com.example.ecommerce.response.UserResponse;
import com.example.ecommerce.service.AdminService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminController {

    private final UserMapper userMapper;
    private final AdminService adminService;

    // 1. Lấy toàn bộ danh sách User
    @GetMapping
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        List<User> users = adminService.getAllUsers();
        List<UserResponse> userResponses = users.stream()
                .map(userMapper::toResponse)
                .toList();
        return ResponseEntity.ok(userResponses);
    }

    // 2. MỚI: Lấy danh sách người dùng có Role = USER
    @GetMapping("/role/user")
    public ResponseEntity<List<UserResponse>> getUsersByRoleUser() {
        List<User> users = adminService.getUsersByRole(UserRole.USER);
        List<UserResponse> userResponses = users.stream()
                .map(userMapper::toResponse)
                .toList();
        return ResponseEntity.ok(userResponses);
    }

    // (Hoặc cách linh hoạt: Truyền Role tùy chỉnh qua PathVariable)
    @GetMapping("/role/{role}")
    public ResponseEntity<List<UserResponse>> getUsersByRole(@PathVariable UserRole role) {
        List<User> users = adminService.getUsersByRole(role);
        List<UserResponse> userResponses = users.stream()
                .map(userMapper::toResponse)
                .toList();
        return ResponseEntity.ok(userResponses);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable String id) {
        User user = adminService.getUserById(id);
        return ResponseEntity.ok(userMapper.toResponse(user));
    }

    @PostMapping
    public ResponseEntity<UserResponse> createUser(@RequestBody UserRequest userRequest) {
        User user = userMapper.toEntity(userRequest);
        User savedUser = adminService.createUser(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(userMapper.toResponse(savedUser));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable String id,
            @RequestBody UserRequest userRequest) {
        User user = userMapper.toEntity(userRequest);
        User updatedUser = adminService.updateUser(id, user);
        return ResponseEntity.ok(userMapper.toResponse(updatedUser));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable String id) {
        adminService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<UserResponse> changeUserStatus(
            @PathVariable String id,
            @RequestBody UserStatus status) {
        User updatedUser = adminService.changeUserStatus(id, status);
        return ResponseEntity.ok(userMapper.toResponse(updatedUser));
    }
}