package com.example.ecommerce.service;

import java.util.List;

import org.springframework.data.domain.Page;

import com.example.ecommerce.request.ProductRequest;
import com.example.ecommerce.response.ProductResponse;

public interface ProductService {

    ProductResponse getProductByAsin(String asin);

    List<ProductResponse> getAllProducts(int page, int size,String category);

    ProductResponse createProduct(ProductRequest productRequest);

    ProductResponse updateProduct(String asin, ProductRequest productRequest);

    ProductResponse changeProductQuantity(String asin, int quantity);

    void deleteProduct(String asin);

    Page<ProductResponse> semanticSearch(String search, int page, int size);

}