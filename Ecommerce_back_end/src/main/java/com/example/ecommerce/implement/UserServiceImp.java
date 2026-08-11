package com.example.ecommerce.implement;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.apache.commons.codec.binary.Base32;
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

        public UserServiceImp(
                        UserRepository userRepository,
                        PasswordEncoder passwordEncoder,
                        EmailService emailService) {

                this.userRepository = userRepository;
                this.passwordEncoder = passwordEncoder;
                this.emailService = emailService;
        }

        @Override
        public boolean isAdmin(String userId) {
                try {
                        if (userId == null || userId.isBlank()) {
                                throw new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST,
                                                "User ID cannot be null or empty");
                        }

                        User user = userRepository.findById(userId)
                                        .orElseThrow(() -> new ResponseStatusException(
                                                        HttpStatus.NOT_FOUND,
                                                        "User not found with id: " + userId));

                        return user.getRole() == UserRole.ADMIN;

                } catch (ResponseStatusException e) {
                        throw e;
                } catch (Exception e) {
                        throw new ResponseStatusException(
                                        HttpStatus.INTERNAL_SERVER_ERROR,
                                        "Failed to check user role",
                                        e);
                }
        }

        @Override
        public UserResponse login(LoginRequest loginRequest) {
                try {
                        if (loginRequest == null) {
                                throw new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST,
                                                "Login request cannot be null");
                        }

                        if (loginRequest.getEmail() == null || loginRequest.getEmail().isBlank()) {
                                throw new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST,
                                                "Email cannot be empty");
                        }

                        if (loginRequest.getPassword() == null || loginRequest.getPassword().isBlank()) {
                                throw new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST,
                                                "Password cannot be empty");
                        }

                        User user = userRepository
                                        .findByEmail(loginRequest.getEmail())
                                        .orElseThrow(() -> new ResponseStatusException(
                                                        HttpStatus.NOT_FOUND,
                                                        "User not found with email: " + loginRequest.getEmail()));

                        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
                                throw new ResponseStatusException(
                                                HttpStatus.UNAUTHORIZED,
                                                "Email or Password is not correct.");
                        }

                        UserResponse response = new UserResponse();
                        response.setId(user.getId());
                        response.setEmail(user.getEmail());
                        response.setFullName(user.getFullName());
                        response.setRole(user.getRole());
                        response.setAvatar(user.getAvatar());
                        return response;

                } catch (ResponseStatusException e) {
                        throw e;
                } catch (Exception e) {
                        throw new ResponseStatusException(
                                        HttpStatus.INTERNAL_SERVER_ERROR,
                                        "Login failed. Please try again later.",
                                        e);
                }
        }

        @Override
        public boolean signup(SignupRequest signupRequest) {
                try {
                        if (signupRequest == null) {
                                throw new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST,
                                                "Signup request cannot be null");
                        }

                        if (signupRequest.getEmail() == null || signupRequest.getEmail().isBlank()) {
                                throw new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST,
                                                "Email cannot be empty");
                        }

                        if (signupRequest.getPassword() == null || signupRequest.getPassword().isBlank()) {
                                throw new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST,
                                                "Password cannot be empty");
                        }

                        if (userRepository.existsByEmail(signupRequest.getEmail())) {
                                throw new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST,
                                                "Email is already in use.");
                        }

                        String encodedPassword = passwordEncoder.encode(signupRequest.getPassword());
                        User newUser = new User();

                        String userId = base32.encodeToString(
                                        UUID.randomUUID().toString().getBytes());

                        newUser.setId(userId);
                        newUser.setPassword(encodedPassword);
                        newUser.setEmail(signupRequest.getEmail());
                        newUser.setRole(UserRole.USER);
                        newUser.setStatus(UserStatus.ACTIVE);
                        newUser.setCreatedAt(LocalDateTime.now());
                        newUser.setUpdatedAt(LocalDateTime.now());
                        newUser.setFullName(signupRequest.getFullName());
                        newUser.setPhoneNumber(signupRequest.getPhoneNumber());
                        newUser.setDateOfBirth(signupRequest.getDateOfBirth());

                        userRepository.save(newUser);
                        return true;

                } catch (ResponseStatusException e) {
                        throw e;
                } catch (Exception e) {
                        throw new ResponseStatusException(
                                        HttpStatus.INTERNAL_SERVER_ERROR,
                                        "Failed to create user. Please try again later.",
                                        e);
                }
        }

        @Override
        public boolean forgetPassword(String email) {
                try {
                        if (email == null || email.isBlank()) {
                                throw new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST,
                                                "Email cannot be empty");
                        }

                        User user = userRepository
                                        .findByEmail(email)
                                        .orElseThrow(() -> new ResponseStatusException(
                                                        HttpStatus.NOT_FOUND,
                                                        "User not found with email: " + email));

                        emailService.sendForgetPasswordEmail(
                                        user.getEmail(),
                                        "https://example.com/reset-password?token=someToken");

                        return true;

                } catch (ResponseStatusException e) {
                        throw e;
                } catch (Exception e) {
                        throw new ResponseStatusException(
                                        HttpStatus.INTERNAL_SERVER_ERROR,
                                        "Failed to send password reset email.",
                                        e);
                }
        }

        @Override
        public User processFirebaseUser(String uid, String email, String name, String picture) {
                try {
                        if (uid == null || uid.isBlank()) {
                                throw new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST,
                                                "Firebase UID cannot be empty");
                        }

                        if (email == null || email.isBlank()) {
                                throw new ResponseStatusException(
                                                HttpStatus.BAD_REQUEST,
                                                "Email cannot be empty");
                        }

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
                        }

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

                } catch (ResponseStatusException e) {
                        throw e;
                } catch (Exception e) {
                        throw new ResponseStatusException(
                                        HttpStatus.INTERNAL_SERVER_ERROR,
                                        "Failed to process Firebase user.",
                                        e);
                }
        }

        @Override
        public void updateAvatar(String userId, String avatarUrl) {
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "User not found with id: " + userId));

                user.setAvatar(avatarUrl);
                user.setUpdatedAt(LocalDateTime.now());
                userRepository.save(user);
        }

        // 🟢 BỔ SUNG HÀM CẬP NHẬT THÔNG TIN USER TẠI ĐÂY
        @Override
        public UserResponse updateUser(String userId, Map<String, Object> updates) {
                try {
                        User user = userRepository.findById(userId)
                                        .orElseThrow(() -> new ResponseStatusException(
                                                        HttpStatus.NOT_FOUND,
                                                        "User not found with id: " + userId));

                        // Cập nhật các trường gửi lên từ Frontend
                        if (updates.containsKey("fullName")) {
                                user.setFullName((String) updates.get("fullName"));
                        }
                        if (updates.containsKey("phoneNumber")) {
                                user.setPhoneNumber((String) updates.get("phoneNumber"));
                        }
                        if (updates.containsKey("postalCode")) {
                                user.setPostalCode((String) updates.get("postalCode"));
                        }
                        user.setUpdatedAt(LocalDateTime.now());
                        User updatedUser = userRepository.save(user);

                        // Trả về DTO
                        UserResponse response = new UserResponse();
                        response.setId(updatedUser.getId());
                        response.setEmail(updatedUser.getEmail());
                        response.setFullName(updatedUser.getFullName());
                        response.setRole(updatedUser.getRole());
                        response.setAvatar(updatedUser.getAvatar());

                        return response;

                } catch (ResponseStatusException e) {
                        throw e;
                } catch (Exception e) {
                        throw new ResponseStatusException(
                                        HttpStatus.INTERNAL_SERVER_ERROR,
                                        "Failed to update user profile",
                                        e);
                }
        }
}