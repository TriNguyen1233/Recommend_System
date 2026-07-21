package com.example.ecommerce.exception;

import java.time.LocalDateTime;
import java.util.Map;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ErrorResponse {
    private LocalDateTime timestamp;
    private int status;             // Mã HTTP Status (400, 404, 500...)
    private String error;           // Tên loại lỗi (Bad Request, Not Found...)
    private String message;         // Lời nhắn dễ hiểu cho người dùng
    private Map<String, String> details; // Chi tiết lỗi của từng trường (nếu có)

    public ErrorResponse(int status, String error, String message) {
        this.timestamp = LocalDateTime.now();
        this.status = status;
        this.error = error;
        this.message = message;
    }
}