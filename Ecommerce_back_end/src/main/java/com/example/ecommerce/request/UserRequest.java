package com.example.ecommerce.request;

import java.util.Date;

import com.example.ecommerce.enums.Gender;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserRequest {

    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;

    @NotBlank(message = "Password cannot be blank")
    @Size(min = 6, message = "Password must be at least 6 characters long")
    private String password;

    @NotBlank(message = "Email cannot be blank")
    @Email(message = "Email is invalid")
    private String email;

    @NotBlank(message = "Full name cannot be blank")
    private String fullName;

    @Pattern(regexp = "^\\+?[0-9]{9,15}$", message = "Phone number is invalid")
    private String phoneNumber;

    private Date dateOfBirth;

    private Gender gender;

    private String avatar;

    private String postalCode;
}