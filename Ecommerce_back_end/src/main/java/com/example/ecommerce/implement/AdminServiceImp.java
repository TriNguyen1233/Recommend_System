package com.example.ecommerce.implement;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.example.ecommerce.entity.User;
import com.example.ecommerce.enums.UserStatus;
import com.example.ecommerce.repository.UserRepository;
import com.example.ecommerce.service.AdminService;

@Service
public class AdminServiceImp implements AdminService{
    UserRepository userRepository;

    public AdminServiceImp(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User createUser(User user) {
        userRepository.save(user);
        return user;
    }

    public User updateUser(String id, User user) {
        userRepository.save(user);
        return user;
    }

    public void deleteUser(String id) {
        userRepository.deleteById(id);
    }

    public User getUserById(String id) {
        return userRepository.findById(id).orElse(null);
    }

    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with email: " + email));
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User changeUserStatus(String email, UserStatus status) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with email: " + email));
        user.setStatus(status);
        userRepository.save(user);

        return user;
    }
}
