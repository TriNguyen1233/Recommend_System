package com.example.ecommerce.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping; // 🟢 Thêm import PutMapping
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.ecommerce.config.JwtTokenProvider;
import com.example.ecommerce.enums.UserRole;
import com.example.ecommerce.mapper.UserMapper;
import com.example.ecommerce.request.LoginRequest;
import com.example.ecommerce.request.SignupRequest;
import com.example.ecommerce.response.UserResponse;
import com.example.ecommerce.service.UserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    private final UserService userService;
    private final UserMapper userMapper;

    @GetMapping("/is-admin")
    public ResponseEntity<Boolean> isAdmin(@RequestParam String userId) {
        return ResponseEntity.ok(userService.isAdmin(userId));
    }

    @PostMapping("/login")
    public ResponseEntity<UserResponse> login(@RequestBody LoginRequest loginRequest) {
        UserResponse userResponse = userService.login(loginRequest);
        String token = jwtTokenProvider.generateToken(loginRequest.getEmail(), userResponse.getRole());

        userResponse.setToken(token);

        return ResponseEntity.ok(userResponse);
    }

    @PostMapping("/signup")
    public ResponseEntity<Boolean> signup(@RequestBody SignupRequest signupRequest) {
        boolean isSignedUp = userService.signup(signupRequest);
        jwtTokenProvider.generateToken(signupRequest.getEmail(), UserRole.USER);

        return ResponseEntity.ok(isSignedUp);
    }

    @PostMapping("/forget-password")
    public ResponseEntity<Boolean> forgetPassword(@RequestParam String email) {
        boolean isEmailSent = userService.forgetPassword(email);
        return ResponseEntity.ok(isEmailSent);
    }

    // 🟢 1. BỔ SUNG ENDPOINT PUT ĐỂ CẬP NHẬT THÔNG TIN PROFILE
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(
            @PathVariable String id,
            @RequestBody Map<String, Object> updates) {
        try {
            // Bạn có thể viết thêm hàm updateUser trong UserService 
            // hoặc tạm thời xử lý cập nhật ở đây
            userService.updateUser(id, updates); 
            return ResponseEntity.ok(Map.of("message", "Cập nhật thông tin thành công!"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Lỗi cập nhật: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/avatar")
    public ResponseEntity<?> uploadAvatar(
            @PathVariable String id,
            @RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("Vui lòng chọn file ảnh!");
            }

            String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();

            // 2. Tạo đường dẫn lưu trữ
            Path uploadPath = Paths.get("uploads/avatars");
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // 3. Ghi file vào đĩa
            Path filePath = uploadPath.resolve(fileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // 4. Tạo URL công khai để truy cập ảnh
            String avatarUrl = "http://localhost:8080/uploads/avatars/" + fileName;

            // 5. Cập nhật avatarUrl vào DB
            userService.updateAvatar(id, avatarUrl);

            return ResponseEntity.ok(Map.of("avatar", avatarUrl, "message", "Upload thành công!"));

        } catch (IOException e) {
            return ResponseEntity.status(500).body("Lỗi khi lưu file: " + e.getMessage());
        }
    }
}