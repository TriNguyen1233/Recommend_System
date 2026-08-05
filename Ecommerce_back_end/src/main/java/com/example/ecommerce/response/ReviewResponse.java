package com.example.ecommerce.response;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewResponse {

    private Integer id;
    private String userId;
    private String userName;
    private int rating;
    private String content;
    private String productAsin;
}