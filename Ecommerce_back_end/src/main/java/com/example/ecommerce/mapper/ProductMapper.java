package com.example.ecommerce.mapper;

import org.mapstruct.Mapper;

import com.example.ecommerce.entity.Product; 
import com.example.ecommerce.request.ProductRequest;
import com.example.ecommerce.response.ProductResponse;

@Mapper(componentModel = "spring")
public interface ProductMapper {

   ProductResponse toProductResponse(Product product);

   Product toProduct(ProductRequest request);
}