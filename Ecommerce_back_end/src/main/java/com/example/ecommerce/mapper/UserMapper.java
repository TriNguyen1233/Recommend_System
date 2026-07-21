package com.example.ecommerce.mapper;

import org.mapstruct.Mapper;

import com.example.ecommerce.entity.User;
import com.example.ecommerce.request.UserRequest;
import com.example.ecommerce.response.UserResponse;

@Mapper(componentModel = "spring") // Giúp Spring Boot quản lý Mapper này như một Bean (@Component)
public interface UserMapper {

    // 1. Chuyển từ UserRequest DTO sang User Entity
    User toEntity(UserRequest request);

    // 2. Chuyển từ User Entity sang UserRequest DTO
    UserRequest toRequest(User user);

    // 3. Chuyển từ User Entity sang UserResponse DTO
    UserResponse toResponse(User user);
}