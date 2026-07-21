package com.example.ecommerce.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {
    
    private Integer id;
    private String asin; // Chỉ trả về mã ASIN của sản phẩm, không bê nguyên cả Object Product phức tạp
    private String userId;
    private int rating;
    private String content;
}