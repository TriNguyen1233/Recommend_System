package com.example.ecommerce.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.ecommerce.service.VNPayService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

        private final VNPayService vnPayService;

        @GetMapping("/create")
        public ResponseEntity<?> createPayment(
                        @RequestParam String orderId,
                        @RequestParam long amount,
                        HttpServletRequest request) {

                String ipAddress = request.getRemoteAddr();

                String paymentUrl = vnPayService.createPaymentUrl(
                                orderId,
                                amount,
                                ipAddress);

                return ResponseEntity.ok(
                                Map.of("paymentUrl", paymentUrl));
        }

        @GetMapping("/vnpay-return")
        public void vnpayReturn(HttpServletRequest request, HttpServletResponse response) throws java.io.IOException {

                String responseCode = request.getParameter("vnp_ResponseCode");
                String transactionStatus = request.getParameter("vnp_TransactionStatus");
                String orderId = request.getParameter("vnp_TxnRef");
                String rawAmount = request.getParameter("vnp_Amount");
                String orderInfo = request.getParameter("vnp_OrderInfo"); // Thường truyền userId tại đây lúc tạo URL
                                                                          // thanh toán

                // VNPay nhân số tiền lên 100 lần, cần chia 100 để lấy số tiền thực tế
                long amount = (rawAmount != null) ? Long.parseLong(rawAmount) / 100 : 0;

                String frontendUrl = "http://localhost:5173";

                // 2. Kiểm tra điều kiện thanh toán thành công (Mã "00" từ VNPay)
                boolean isSuccess = "00".equals(responseCode) && "00".equals(transactionStatus);

                if (isSuccess) {
                        // Build URL đính kèm các tham số cần thiết cho Frontend và PaymentConfirmGuard
                        StringBuilder redirectUrl = new StringBuilder(frontendUrl)
                                        .append("/paymentconfirm")
                                        .append("?vnp_ResponseCode=").append(responseCode)
                                        .append("&orderId=").append(orderId)
                                        .append("&amount=").append(amount)
                                        .append("&paymentStatus=success");

                        // Đính kèm userId nếu có trong orderInfo (để Guard kiểm tra)
                        if (orderInfo != null && !orderInfo.isBlank()) {
                                redirectUrl.append("&userId=").append(orderInfo);
                        }

                        response.sendRedirect(redirectUrl.toString());
                } else {
                        StringBuilder redirectUrl = new StringBuilder(frontendUrl)
                                        .append("/paymentfailed")
                                        .append("?code=").append(responseCode != null ? responseCode : "CANCELLED")
                                        .append("&orderId=").append(orderId)
                                        .append("&status=failed");

                        response.sendRedirect(redirectUrl.toString());
                }
        }

        @GetMapping("/vnpay-ipn")
        public ResponseEntity<?> vnpayIPN(
                        HttpServletRequest request) {

                String orderId = request.getParameter("vnp_TxnRef");
                String responseCode = request.getParameter("vnp_ResponseCode");
                String transactionStatus = request.getParameter("vnp_TransactionStatus");
                String frontendBaseUrl = "http://localhost:5173";
                if ("00".equals(responseCode) && "00".equals(transactionStatus)) {

                        return ResponseEntity.ok(
                                        Map.of(
                                                        "RspCode", "00",
                                                        "Message", "Confirm Success"));
                }

                return ResponseEntity.ok(
                                Map.of(
                                                "RspCode", "99",
                                                "Message", "Unknown error"));
        }
}