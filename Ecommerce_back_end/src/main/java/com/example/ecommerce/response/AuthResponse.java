package com.example.ecommerce.response; // Thay bằng package của bạn

public class AuthResponse {
    private boolean success;
    private String token;

    public AuthResponse(boolean success, String token) {
        this.success = success;
        this.token = token;
    }

    // Getter và Setter
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
}