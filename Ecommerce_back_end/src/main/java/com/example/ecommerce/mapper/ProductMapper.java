package com.example.ecommerce.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.example.ecommerce.entity.Product;
import com.example.ecommerce.entity.Review;
import com.example.ecommerce.request.ProductRequest;
import com.example.ecommerce.response.ProductResponse;
import com.example.ecommerce.response.ReviewResponse;

@Mapper(componentModel = "spring")
public interface ProductMapper {

   ProductResponse toProductResponse(Product product);

   Product toProduct(ProductRequest request);

   @Mapping(source = "user.id", target = "userId")
   ReviewResponse reviewToReviewResponse(Review review);
}