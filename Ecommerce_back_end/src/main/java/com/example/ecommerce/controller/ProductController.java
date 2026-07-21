package com.example.ecommerce.controller;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.ecommerce.request.ProductRequest;
import com.example.ecommerce.response.ProductResponse;
import com.example.ecommerce.service.ProductService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor; // Kích hoạt Validation cho RequestBody

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {
    @Autowired
    private final ProductService productService;

    // 1. LẤY MỘT SẢN PHẨM THEO ASIN - Trả về ProductResponse
    @GetMapping("/{asin}")
    public ResponseEntity<ProductResponse> getProductByAsin(@PathVariable String asin) {
        ProductResponse productResponse = productService.getProductByAsin(asin);
        if (productResponse == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(productResponse);
    }

    // 2. LẤY TẤT CẢ SẢN PHẨM - Trả về danh sách ProductResponse
    @GetMapping
    public ResponseEntity<List<ProductResponse>> getAllProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam String category) {

        List<ProductResponse> products = productService.getAllProducts(page, size, category);
        return ResponseEntity.ok(products);
    }

    @PostMapping
    public ResponseEntity<ProductResponse> createProduct(@Valid @RequestBody ProductRequest productRequest) {
        ProductResponse createdProduct = productService.createProduct(productRequest);
        return ResponseEntity.ok(createdProduct);
    }

    // 4. CẬP NHẬT SẢN PHẨM THEO ASIN - Nhận ProductRequest, Trả về ProductResponse
    @PutMapping("/{asin}")
    public ResponseEntity<ProductResponse> updateProduct(
            @PathVariable String asin,
            @Valid @RequestBody com.example.ecommerce.request.ProductRequest productRequest) {
        ProductResponse updatedProduct = productService.updateProduct(asin, productRequest);
        return ResponseEntity.ok(updatedProduct);
    }

    @PutMapping("/{asin}/change-quantity")
    public ResponseEntity<ProductResponse> changeProductQuantity(
            @PathVariable String asin,
            @RequestParam int quantity) {
        ProductResponse updatedProduct = productService.changeProductQuantity(asin, quantity);
        return ResponseEntity.ok(updatedProduct);
    }

    // 6. XÓA SẢN PHẨM THEO ASIN (Giữ nguyên vì chỉ trả về câu thông báo dạng
    // String)
    @DeleteMapping("/{asin}")
    public ResponseEntity<String> deleteProduct(@PathVariable String asin) {
        productService.deleteProduct(asin);
        return ResponseEntity.ok("Product deleted successfully with ASIN: " + asin);
    }

    @GetMapping("/semantic")
    public ResponseEntity<Page<ProductResponse>> semanticSearch(
            @RequestParam(name = "query") String query,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
        Page<ProductResponse> products = productService.semanticSearch(query, page, size);
        return ResponseEntity.ok(products);
    }
}