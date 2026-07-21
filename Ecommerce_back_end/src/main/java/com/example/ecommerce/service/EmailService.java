package com.example.ecommerce.service;

public interface  EmailService {
    void sendForgetPasswordEmail(String toEmail, String resetLink);
}
