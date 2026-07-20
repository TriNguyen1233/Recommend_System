package com.example.ecommerce.repository;

import java.util.List;

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
                main_category AS mainCategory,
                category,
                image_url AS imageUrl,
                store,
                (1 - (embedding_vector <=> CAST(:vectorString AS vector))) AS cosineSimilarity
            FROM products
            WHERE main_category = :mainCategory
            ORDER BY embedding_vector <=> CAST(:vectorString AS vector) ASC
            LIMIT :limit
            """, nativeQuery = true)
    List<ProductVectorProjection> findSimilarProducts(
            @Param("vectorString") String vectorString,
            @Param("mainCategory") String mainCategory,
            @Param("limit") int limit);
}
