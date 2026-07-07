package com.example.ecommerce.entity;

// Import các class mới từ package java.time
import java.time.LocalDateTime;
import java.util.Date;
import java.util.List;

import com.example.ecommerce.enums.Gender;
import com.example.ecommerce.enums.UserRole;
import com.example.ecommerce.enums.UserStatus;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(name = "users")
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@ToString
public class User {

    @Id
    @Column(name = "user_id")
    private String Id;

    @Column(name = "username", nullable = true, unique = true)
    private String username;

    @Column(name = "password", nullable = false)
    private String password;

    @Email(message = "email is invalid")
    @NotBlank(message = "email can't be blank")
    @Column(nullable = false, unique = true)
    private String email;

    @Pattern(regexp = "^\\+?[0-9]{9,15}$", message = "invalid phone")
    @Column(name = "phone_number", nullable = true, unique = true)
    private String phoneNumber;

    @Column(name = "full_name",nullable = false)
    private String fullName;

    // Thay thế Date bằng LocalDate: Tự động map thành kiểu DATE trong DB
    @Column(name = "date_of_birth", nullable = true)
    private Date dateOfBirth;

    @Enumerated(EnumType.STRING)
    private Gender gender;

    private String avatar;

    @Enumerated(EnumType.STRING)
    private UserStatus status;

    @Enumerated(EnumType.STRING)
    private UserRole role;

    @Column(name = "postal_code", nullable = true)
    private String postalCode;

    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Cart> carts; // Thêm danh sách giỏ hàng của người dùng
}