package com.example.ecommerce.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.ecommerce.config.JwtTokenProvider;
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
        String token = jwtTokenProvider.generateToken(loginRequest.getEmail());

        userResponse.setToken(token);

        return ResponseEntity.ok(userResponse);
    }

    // 2. Nhận vào SignupRequest với đầy đủ các trường cần thiết để đăng ký
    @PostMapping("/signup")
    public ResponseEntity<Boolean> signup(@RequestBody SignupRequest signupRequest) {
        boolean isSignedUp = userService.signup(signupRequest);
        jwtTokenProvider.generateToken(signupRequest.getEmail());

        return ResponseEntity.ok(isSignedUp);
    }

    @PostMapping("/forget-password")
    public ResponseEntity<Boolean> forgetPassword(@RequestParam String email) {
        boolean isEmailSent = userService.forgetPassword(email);
        return ResponseEntity.ok(isEmailSent);
    }
}