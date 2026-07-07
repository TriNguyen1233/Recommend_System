package com.example.ecommerce.dto;

import java.time.LocalDateTime;
import java.util.Date;
import java.util.List;

import com.example.ecommerce.entity.Cart;
import com.example.ecommerce.enums.Gender;
import com.example.ecommerce.enums.UserRole;
import com.example.ecommerce.enums.UserStatus;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class UserResponse {
    
        private String Id;
    
        private String username;
    
        private String email;
    
        private String phoneNumber;
    
        private String fullName;
    
        private Date dateOfBirth;
    
        private Gender gender;
    
        private String avatar;
    
        private UserStatus status;
    
        private UserRole role;
    
        private String postalCode;
    
        private LocalDateTime createdAt;
    
        private LocalDateTime updatedAt;
    
        private List<Cart> carts;
    }



