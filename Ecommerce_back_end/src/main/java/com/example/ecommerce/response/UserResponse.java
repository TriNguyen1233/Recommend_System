package com.example.ecommerce.response;

import java.time.LocalDateTime;
import java.util.Date;

import com.example.ecommerce.enums.Gender;
import com.example.ecommerce.enums.UserRole;
import com.example.ecommerce.enums.UserStatus;

import lombok.Data;

@Data
public class UserResponse {
    private String id;
    private String username;
    private String email;
    private String phoneNumber;
    private String fullName;
    private Date dateOfBirth;
    private Gender gender;
    private UserStatus status;
    private UserRole role;
    private String postalCode;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String token;
}