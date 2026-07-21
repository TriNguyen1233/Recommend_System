package com.example.ecommerce.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.ecommerce.entity.Product;
import com.example.ecommerce.recommendSystem.ProductVectorProjection;

public interface ProductRepository extends JpaRepository<Product, String> {
    Product findByAsin(String asin);

    Page<Product> findByCategory(String category, Pageable pageable);

    @Query(value = """
            SELECT
                parent_asin AS parentAsin,
                title,
                price,
                category,
                image_url AS imageUrl,
                (1 - (embedding <=> CAST(:vectorString AS vector))) AS cosineSimilarity
            FROM products
            ORDER BY embedding <=> CAST(:vectorString AS vector) ASC
            """, countQuery = "SELECT COUNT(*) FROM products", nativeQuery = true)
    Page<ProductVectorProjection> findSimilarProducts(
            @Param("vectorString") String vectorString,
            Pageable pageable);
}