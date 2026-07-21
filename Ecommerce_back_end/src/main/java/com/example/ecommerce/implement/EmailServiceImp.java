package com.example.ecommerce.implement;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import com.example.ecommerce.service.EmailService;

import jakarta.mail.internet.MimeMessage;

@Service
public class EmailServiceImp implements EmailService{
    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String senderEmail;

    /**
     * Hàm gửi email văn bản đơn giản
     * 
     * @param toEmail Email người nhận
     * @param subject Tiêu đề email
     * @param body    Nội dung email
     */
    public void sendForgetPasswordEmail(String toEmail, String resetLink) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            // Bật chế độ multipart = true và đặt mã hóa UTF-8
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            // 1. Tạo Tiêu đề (Subject) tiếng Anh chuyên nghiệp
            String subject = "Reset Your Password - E-Commerce Support";

            // 2. Tạo Nội dung (Body) bằng HTML giao diện hiện đại
            String htmlBody = """
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <title>Reset Your Password</title>
                        <style>
                            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 0; }
                            .container { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
                            .header { background-color: #4F46E5; padding: 30px; text-align: center; color: white; }
                            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                            .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
                            .content p { margin-top: 0; margin-bottom: 20px; font-size: 16px; }
                            .btn-wrapper { text-align: center; margin: 30px 0; }
                            .btn { background-color: #4F46E5; color: #ffffff !important; padding: 12px 30px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block; font-size: 16px; transition: background-color 0.2s; }
                            .footer { background-color: #f9fafb; padding: 20px; text-align: center; color: #777777; font-size: 13px; border-top: 1px solid #edf2f7; }
                            .warning { font-size: 14px; color: #666666; background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 25px; border-radius: 4px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>TECH STORE</h1>
                            </div>
                            <div class="content">
                                <p>Hi there,</p>
                                <p>We received a request to reset the password for your account. No changes have been made yet.</p>
                                <p>You can reset your password by clicking the secure button below:</p>

                                <div class="btn-wrapper">
                                    <a href="%s" class="btn" target="_blank">Reset Password</a>
                                </div>

                                <div class="warning">
                                    <strong>Note:</strong> This password reset link is valid for a limited time. If you did not request a password reset, please ignore this email or contact our support team if you have any concerns.
                                </div>
                            </div>
                            <div class="footer">
                                <p>© 2026 TECH STORE. All rights reserved.</p>
                                <p>Need help? Contact our <a href="#" style="color: #4F46E5; text-decoration: none;">Support Center</a></p>
                            </div>
                        </div>
                    </body>
                    </html>
                    """
                    .formatted(resetLink); // Nhúng link reset vào nút bấm [%s]

            helper.setFrom(senderEmail);
            helper.setTo(toEmail);
            helper.setSubject(subject);

            // QUAN TRỌNG: Tham số thứ 2 là 'true' để xác nhận đây là HTML
            helper.setText(htmlBody, true);

            mailSender.send(message);
            System.out.println("=> HTML Forget Password Email is sent to: " + toEmail);
        } catch (Exception e) {
            System.err.println("Email sending error: " + e.getMessage());
        }
    }
}