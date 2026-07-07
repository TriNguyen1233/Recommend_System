package com.example.ecommerce.controller;

import java.util.Date;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.ecommerce.entity.User;
import com.example.ecommerce.service.UserService;

import lombok.RequiredArgsConstructor;


@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    

    @GetMapping("/is-admin")
    public ResponseEntity<Boolean> isAdmin(@RequestParam String userId) {
        return ResponseEntity.ok(userService.isAdmin(userId));
    }
    @PostMapping("/login")
    public ResponseEntity<User> login(@RequestParam String email, @RequestParam String password) {
        User user = userService.login(email, password);
        return ResponseEntity.ok(user);
    }
    @PostMapping("/signup")
    public ResponseEntity<Boolean> signup(@RequestParam String email, @RequestParam String fullName, @RequestParam String phoneNumber,
         @RequestParam Date dateOfBirth, @RequestParam String password) {
        boolean isSignedUp = userService.signup(email, fullName, phoneNumber, dateOfBirth, password);
        return ResponseEntity.ok(isSignedUp);
    }
}
