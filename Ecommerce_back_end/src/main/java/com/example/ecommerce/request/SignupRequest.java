package com.example.ecommerce.request;

import java.util.Date;
import com.example.ecommerce.enums.Gender;
import lombok.Data;

@Data
public class SignupRequest {
    private String email;
    private String password;
    private String fullName;
    private String phoneNumber;
    private Date dateOfBirth;
    private Gender gender; // Thêm sẵn từ DTO cũ của bạn nếu cần
}