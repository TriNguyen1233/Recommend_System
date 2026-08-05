package com.example.ecommerce.service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;

import org.springframework.stereotype.Service;

import com.example.ecommerce.config.VNPayConfig;
import com.example.ecommerce.util.VNPayUtil;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VNPayService {

    private final VNPayConfig config;

    public String createPaymentUrl(String orderId, long amount, String ipAddress) {
        Map<String, String> vnp_Params = new HashMap<>();

        vnp_Params.put("vnp_Version", "2.1.0");
        vnp_Params.put("vnp_Command", "pay");
        vnp_Params.put("vnp_TmnCode", config.getTmnCode().trim());
        vnp_Params.put("vnp_Amount", String.valueOf(amount * 100)); // Nhân 100 theo quy định VNPay
        vnp_Params.put("vnp_CurrCode", "VND");
        vnp_Params.put("vnp_TxnRef", orderId);
        vnp_Params.put("vnp_OrderInfo", "Thanh toan don hang " + orderId);
        vnp_Params.put("vnp_OrderType", "other");
        vnp_Params.put("vnp_Locale", "vn");
        vnp_Params.put("vnp_ReturnUrl", config.getReturnUrl().trim());

        // Chuẩn hóa IP
        if (ipAddress == null || "0:0:0:0:0:0:0:1".equals(ipAddress)) {
            ipAddress = "127.0.0.1";
        }
        vnp_Params.put("vnp_IpAddr", ipAddress);

        // Định dạng thời gian theo múi giờ GMT+7 (Việt Nam)
        Calendar cld = Calendar.getInstance(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");
        formatter.setTimeZone(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));

        String vnp_CreateDate = formatter.format(cld.getTime());
        vnp_Params.put("vnp_CreateDate", vnp_CreateDate);

        // Thời gian hết hạn thanh toán (+15 phút)
        cld.add(Calendar.MINUTE, 15);
        String vnp_ExpireDate = formatter.format(cld.getTime());
        vnp_Params.put("vnp_ExpireDate", vnp_ExpireDate);

        // Sắp xếp param theo thứ tự Alphabet
        List<String> fieldNames = new ArrayList<>(vnp_Params.keySet());
        Collections.sort(fieldNames);

        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();

        Iterator<String> itr = fieldNames.iterator();
        while (itr.hasNext()) {
            String fieldName = itr.next();
            String fieldValue = vnp_Params.get(fieldName);

            if ((fieldValue != null) && (fieldValue.length() > 0)) {
                try {
                    // Encode theo chuẩn US_ASCII của VNPay Java SDK
                    String encodedFieldName = URLEncoder.encode(fieldName, StandardCharsets.US_ASCII.toString());
                    String encodedFieldValue = URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString());

                    // Build Hash Data
                    hashData.append(fieldName);
                    hashData.append('=');
                    hashData.append(encodedFieldValue);

                    // Build Query URL
                    query.append(encodedFieldName);
                    query.append('=');
                    query.append(encodedFieldValue);

                    if (itr.hasNext()) {
                        query.append('&');
                        hashData.append('&');
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }

        String queryUrl = query.toString();
        // Tạo Secure Hash từ hashData
        String vnp_SecureHash = VNPayUtil.hmacSHA512(config.getHashSecret().trim(), hashData.toString());
        queryUrl += "&vnp_SecureHash=" + vnp_SecureHash;

        return config.getPayUrl() + "?" + queryUrl;
    }
}