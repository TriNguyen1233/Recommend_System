package com.example.ecommerce.entity;

import java.time.LocalDateTime; // Sử dụng LocalDate thay cho java.util.Date
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

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
import jakarta.validation.constraints.NotNull;
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
@ToString(exclude = "password")
public class User implements UserDetails{

    @Id
    @Column(name = "user_id")
    @NotBlank(message = "User ID cannot be blank")
    private String id;

    @Column(name = "username", unique = true)
    private String username;

    @Column(name = "password", nullable = false)
    @NotBlank(message = "Password cannot be blank")
    private String password;

    @Email(message = "Email is invalid")
    @NotBlank(message = "Email cannot be blank")
    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Pattern(regexp = "^\\+?[0-9]{9,15}$", message = "Phone number is invalid")
    @Column(name = "phone_number", unique = true)
    private String phoneNumber;

    @Column(name = "full_name", nullable = false)
    @NotBlank(message = "Full name cannot be blank")
    private String fullName;

    @Column(name = "date_of_birth") 
    private Date dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender")
    private Gender gender;

    @Column(name = "avatar")
    private String avatar;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @NotNull(message = "User status is required")
    private UserStatus status = UserStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    @NotNull(message = "User role is required")
    private UserRole role = UserRole.USER;

    @Column(name = "postal_code")
    private String postalCode;

    @Column(name = "created_at", updatable = false, nullable = false)
    @NotNull(message = "Creation time cannot be null")
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    @NotNull(message = "Update time cannot be null")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Cart> carts = new ArrayList<>();

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of();
    }
}