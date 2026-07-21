package com.example.ecommerce.implement;

import java.util.Arrays;
import java.util.List;

import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.example.ecommerce.entity.Product;
import com.example.ecommerce.mapper.ProductMapper;
import com.example.ecommerce.recommendSystem.ProductVectorProjection;
import com.example.ecommerce.repository.ProductRepository;
import com.example.ecommerce.request.ProductRequest;
import com.example.ecommerce.response.ProductResponse;
import com.example.ecommerce.service.ProductService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProductServiceImp implements ProductService {
    @Autowired
    private final ProductRepository productRepository;
    @Autowired
    private final ProductMapper productMapper;
    private final EmbeddingModel embeddingModel;

    @Override
    public ProductResponse getProductByAsin(String asin) {
        // Giả sử findByAsin trả về Product (Entity) hoặc Optional<Product>
        Product product = productRepository.findByAsin(asin);
        return productMapper.toProductResponse(product);
    }

    @Override
    public List<ProductResponse> getAllProducts(int page, int size, String category) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Product> productPage;

        if (category != null && !category.trim().isEmpty()) {
            productPage = productRepository.findByCategory(category, pageable);
        } else {
            productPage = productRepository.findAll(pageable);
        }

        return productPage.getContent().stream()
                .map(productMapper::toProductResponse)
                .toList();
    }

    @Override
    public ProductResponse createProduct(ProductRequest productRequest) {
        // Chuyển Request DTO sang Entity để lưu vào DB
        Product product = productMapper.toProduct(productRequest);
        Product savedProduct = productRepository.save(product);
        // Trả về Response DTO
        return productMapper.toProductResponse(savedProduct);
    }

    @Override
    public ProductResponse updateProduct(String asin, ProductRequest productRequest) {
        // Thay thế .orElseThrow() bằng .orElse(null)
        Product existingProduct = productRepository.findByAsin(asin);

        // Kiểm tra điều kiện if (== null) và throw exception
        if (existingProduct == null) {
            throw new RuntimeException("Product not found");
        }

        // Cập nhật thông tin từ request vào existingProduct (hoặc dùng mapper tùy biến)
        existingProduct.setTitle(productRequest.getTitle());
        existingProduct.setDescription(productRequest.getDescription());
        existingProduct.setPrice(productRequest.getPrice());
        existingProduct.setImage(productRequest.getImage());
        existingProduct.setStockQuantity(productRequest.getStockQuantity());
        existingProduct.setStatus(productRequest.getStatus());

        Product updatedProduct = productRepository.save(existingProduct);
        return productMapper.toProductResponse(updatedProduct);
    }

    @Override
    public ProductResponse changeProductQuantity(String asin, int quantity) {
        // Thay thế .orElseThrow() bằng .orElse(null)
        Product product = productRepository.findByAsin(asin);

        // Kiểm tra điều kiện if (== null) và throw exception
        if (product == null) {
            throw new RuntimeException("Product not found");
        }

        product.setStockQuantity(product.getStockQuantity() + quantity);
        Product updatedProduct = productRepository.save(product);
        return productMapper.toProductResponse(updatedProduct);
    }

    @Override
    public void deleteProduct(String asin) {
        // Thay thế .orElseThrow() bằng .orElse(null)
        Product product = productRepository.findByAsin(asin);

        // Kiểm tra điều kiện if (== null) và throw exception
        if (product == null) {
            throw new RuntimeException("Product not found");
        }

        productRepository.delete(product);
    }

    @Override
    public Page<ProductResponse> semanticSearch(String search, int page, int size) {
        float[] vectorArray = embeddingModel.embed(search);
        String vectorString = Arrays.toString(vectorArray);

        Pageable pageable = PageRequest.of(page, size);

        Page<ProductVectorProjection> projections = productRepository.findSimilarProducts(vectorString, pageable);

        return projections.map(p -> ProductResponse.builder()
                .asin(p.getParentAsin())
                .title(p.getTitle())
                .price(p.getPrice() != null ? p.getPrice().floatValue() : 0f) 
                .image(p.getImageUrl())
                .category(p.getCategory())
                .build());
    }

}