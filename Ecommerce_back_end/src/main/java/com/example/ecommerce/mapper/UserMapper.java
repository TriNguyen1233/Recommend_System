package com.example.ecommerce.mapper;

import org.springframework.stereotype.Component;

import com.example.ecommerce.dto.UserRequest;
import com.example.ecommerce.dto.UserResponse;
import com.example.ecommerce.entity.User;

@Component
public class UserMapper {

    /**
     * DTO -> Entity
     */
    public User toEntity(UserRequest request) {

        if (request == null) {
            return null;
        }

        User user = new User();

        user.setId(request.getId());
        user.setUsername(request.getUsername());
        user.setPassword(request.getPassword());
        user.setEmail(request.getEmail());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setFullName(request.getFullName());
        user.setDateOfBirth(request.getDateOfBirth());
        user.setGender(request.getGender());
        user.setStatus(request.getStatus());
        user.setRole(request.getRole());
        user.setPostalCode(request.getPostalCode());
        user.setCreatedAt(request.getCreatedAt());
        user.setUpdatedAt(request.getUpdatedAt());

        return user;
    }

    /**
     * Entity -> DTO
     */
    public UserRequest toRequest(User user) {

        if (user == null) {
            return null;
        }

        UserRequest request = new UserRequest();

        request.setId(user.getId());
        request.setUsername(user.getUsername());
        request.setPassword(user.getPassword());
        request.setEmail(user.getEmail());
        request.setPhoneNumber(user.getPhoneNumber());
        request.setFullName(user.getFullName());
        request.setDateOfBirth(user.getDateOfBirth());
        request.setGender(user.getGender());
        request.setStatus(user.getStatus());
        request.setRole(user.getRole());
        request.setPostalCode(user.getPostalCode());
        request.setCreatedAt(user.getCreatedAt());
        request.setUpdatedAt(user.getUpdatedAt());

        return request;
    }

    public UserResponse toResponse(User user) {

        if (user == null) {
            return null;
        }

        UserResponse response = new UserResponse();

        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setPhoneNumber(user.getPhoneNumber());
        response.setFullName(user.getFullName());
        response.setDateOfBirth(user.getDateOfBirth());
        response.setGender(user.getGender());
        response.setAvatar(user.getAvatar());
        response.setStatus(user.getStatus());
        response.setRole(user.getRole());
        response.setPostalCode(user.getPostalCode());
        response.setCreatedAt(user.getCreatedAt());
        response.setUpdatedAt(user.getUpdatedAt());
        response.setCarts(user.getCarts());

        return response;
    }

}