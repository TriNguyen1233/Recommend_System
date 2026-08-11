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

        try {

            if (asin == null || asin.isBlank()) {
                throw new IllegalArgumentException(
                        "ASIN cannot be null or empty");
            }

            Product product = productRepository.findByAsin(asin);

            if (product == null) {
                throw new RuntimeException(
                        "Product not found with ASIN: " + asin);
            }

            return productMapper.toProductResponse(product);

        } catch (IllegalArgumentException e) {

            throw e;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Failed to get product with ASIN: " + asin,
                    e);
        }
    }

    @Override
    public List<ProductResponse> getAllProducts(
            int page,
            int size,
            String category) {

        try {

            if (page < 0) {
                throw new IllegalArgumentException(
                        "Page must be greater than or equal to 0");
            }

            if (size <= 0) {
                throw new IllegalArgumentException(
                        "Size must be greater than 0");
            }

            Pageable pageable = PageRequest.of(page, size);

            Page<Product> productPage;

            if (category != null && !category.trim().isEmpty()) {

                productPage = productRepository.findByCategory(
                        category,
                        pageable);

            } else {

                productPage = productRepository.findAll(pageable);
            }

            return productPage
                    .getContent()
                    .stream()
                    .map(productMapper::toProductResponse)
                    .toList();

        } catch (IllegalArgumentException e) {

            throw e;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Failed to get products",
                    e);
        }
    }

    @Override
    public ProductResponse createProduct(
            ProductRequest productRequest) {

        try {

            if (productRequest == null) {
                throw new IllegalArgumentException(
                        "Product request cannot be null");
            }

            Product product = productMapper.toProduct(productRequest);

            if (product == null) {
                throw new RuntimeException(
                        "Failed to map product request");
            }

            Product savedProduct = productRepository.save(product);

            return productMapper.toProductResponse(
                    savedProduct);

        } catch (IllegalArgumentException e) {

            throw e;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Failed to create product",
                    e);
        }
    }

    @Override
    public ProductResponse updateProduct(
            String asin,
            ProductRequest productRequest) {

        try {

            if (asin == null || asin.isBlank()) {
                throw new IllegalArgumentException(
                        "ASIN cannot be null or empty");
            }

            if (productRequest == null) {
                throw new IllegalArgumentException(
                        "Product request cannot be null");
            }

            Product existingProduct = productRepository.findByAsin(asin);

            if (existingProduct == null) {
                throw new RuntimeException(
                        "Product not found with ASIN: " + asin);
            }

            existingProduct.setTitle(
                    productRequest.getTitle());

            existingProduct.setDescription(
                    productRequest.getDescription());

            existingProduct.setPrice(
                    productRequest.getPrice());

            existingProduct.setImage(
                    productRequest.getImage());

            existingProduct.setStockQuantity(
                    productRequest.getStockQuantity());

            existingProduct.setStatus(
                    productRequest.getStatus());

            Product updatedProduct = productRepository.save(existingProduct);

            return productMapper.toProductResponse(
                    updatedProduct);

        } catch (IllegalArgumentException e) {

            throw e;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Failed to update product with ASIN: "
                            + asin,
                    e);
        }
    }

    @Override
    public ProductResponse changeProductQuantity(
            String asin,
            int quantity) {

        try {

            if (asin == null || asin.isBlank()) {
                throw new IllegalArgumentException(
                        "ASIN cannot be null or empty");
            }

            Product product = productRepository.findByAsin(asin);

            if (product == null) {
                throw new RuntimeException(
                        "Product not found with ASIN: " + asin);
            }

            int newQuantity = product.getStockQuantity() + quantity;

            if (newQuantity < 0) {
                throw new IllegalArgumentException(
                        "Stock quantity cannot be negative");
            }

            product.setStockQuantity(newQuantity);

            Product updatedProduct = productRepository.save(product);

            return productMapper.toProductResponse(
                    updatedProduct);

        } catch (IllegalArgumentException e) {

            throw e;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Failed to change product quantity for ASIN: "
                            + asin,
                    e);
        }
    }

    @Override
    public void deleteProduct(String asin) {

        try {

            if (asin == null || asin.isBlank()) {
                throw new IllegalArgumentException(
                        "ASIN cannot be null or empty");
            }

            Product product = productRepository.findByAsin(asin);

            if (product == null) {
                throw new RuntimeException(
                        "Product not found with ASIN: " + asin);
            }

            productRepository.delete(product);

        } catch (IllegalArgumentException e) {

            throw e;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Failed to delete product with ASIN: "
                            + asin,
                    e);
        }
    }

    @Override
    public Page<ProductResponse> semanticSearch(
            String search,
            int page,
            int size) {

        try {

            if (search == null || search.isBlank()) {
                throw new IllegalArgumentException(
                        "Search keyword cannot be null or empty");
            }

            if (page < 0) {
                throw new IllegalArgumentException(
                        "Page must be greater than or equal to 0");
            }

            if (size <= 0) {
                throw new IllegalArgumentException(
                        "Size must be greater than 0");
            }

            float[] vectorArray = embeddingModel.embed(search);

            if (vectorArray == null
                    || vectorArray.length == 0) {

                throw new RuntimeException(
                        "Failed to generate embedding");
            }

            String vectorString = Arrays.toString(vectorArray);

            Pageable pageable = PageRequest.of(page, size);

            Page<ProductVectorProjection> projections = productRepository.findSimilarProducts(
                    vectorString,
                    pageable);

            return projections.map(p -> ProductResponse.builder()
                    .asin(p.getParentAsin())
                    .title(p.getTitle())
                    .price(
                            p.getPrice() != null
                                    ? p.getPrice().floatValue()
                                    : 0f)
                    .image(p.getImageUrl())
                    .category(p.getCategory())
                    .build());

        } catch (IllegalArgumentException e) {

            throw e;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Failed to perform semantic search: "
                            + search,
                    e);
        }
    }
}