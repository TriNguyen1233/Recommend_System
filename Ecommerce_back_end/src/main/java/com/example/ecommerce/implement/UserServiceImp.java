package com.example.ecommerce.implement;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import org.apache.commons.codec.binary.Base32;
import org.apache.kafka.common.errors.ResourceNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.example.ecommerce.entity.User;
import com.example.ecommerce.enums.UserRole;
import com.example.ecommerce.enums.UserStatus;
import com.example.ecommerce.repository.UserRepository;
import com.example.ecommerce.request.LoginRequest;
import com.example.ecommerce.request.SignupRequest;
import com.example.ecommerce.response.UserResponse;
import com.example.ecommerce.service.EmailService;
import com.example.ecommerce.service.UserService;

@Service
public class UserServiceImp implements UserService {

    private final UserRepository userRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final Base32 base32 = new Base32();

    public UserServiceImp(UserRepository userRepository, PasswordEncoder passwordEncoder, EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    public boolean isAdmin(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        return user.getRole() == UserRole.ADMIN;
    }

    @Override
    public UserResponse login(LoginRequest loginRequest) {
        User user = userRepository.findByEmail(loginRequest.getEmail()).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "User not found with email: " + loginRequest.getEmail()));

        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email or Password is not correct.");
        }

        UserResponse response = new UserResponse();
        response.setId(user.getId());
        response.setEmail(user.getEmail());
        response.setFullName(user.getFullName());
        response.setRole(user.getRole());

        return response;
    }

    @Override
    public boolean signup(SignupRequest signupRequest) {
        if (userRepository.existsByEmail(signupRequest.getEmail())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is already in use.");
        }

        String encodedPassword = passwordEncoder.encode(signupRequest.getPassword());

        User newUser = new User();
        String userId = base32.encodeToString(UUID.randomUUID().toString().getBytes());
        newUser.setId(userId);
        newUser.setPassword(encodedPassword);

        newUser.setEmail(signupRequest.getEmail());

        newUser.setRole(UserRole.USER);
        newUser.setCreatedAt(LocalDateTime.now());
        newUser.setUpdatedAt(LocalDateTime.now());
        newUser.setFullName(signupRequest.getFullName());
        newUser.setPhoneNumber(signupRequest.getPhoneNumber());
        newUser.setDateOfBirth(signupRequest.getDateOfBirth());

        userRepository.save(newUser);
        return true;
    }

    public boolean forgetPassword(String email) {
        User user = userRepository.findByEmail(email).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with email: " + email));
        emailService.sendForgetPasswordEmail(user.getEmail(), "https://example.com/reset-password?token=someToken");
        return true;
    }

    public User processFirebaseUser(String uid, String email, String name, String picture) {
        Optional<User> userOptional = userRepository.findByEmail(email);

        if (userOptional.isEmpty()) {
            User newUser = new User();
            newUser.setId(uid);
            newUser.setUsername(email);
            newUser.setEmail(email);
            newUser.setFullName(name);
            newUser.setAvatar(picture);
            newUser.setPassword("FIREBASE_OAUTH_PROTECTED"); 
            newUser.setStatus(UserStatus.ACTIVE); 
            newUser.setRole(UserRole.USER); 
            newUser.setCreatedAt(LocalDateTime.now());
            newUser.setUpdatedAt(LocalDateTime.now());

            return userRepository.save(newUser);
        } else {
            User existingUser = userOptional.get();
            boolean isUpdated = false;

            if (picture != null && !picture.equals(existingUser.getAvatar())) {
                existingUser.setAvatar(picture);
                isUpdated = true;
            }
            if (name != null && !name.equals(existingUser.getFullName())) {
                existingUser.setFullName(name);
                isUpdated = true;
            }

            if (isUpdated) {
                existingUser.setUpdatedAt(LocalDateTime.now());
                return userRepository.save(existingUser);
            }
            return existingUser;
        }
    }

}