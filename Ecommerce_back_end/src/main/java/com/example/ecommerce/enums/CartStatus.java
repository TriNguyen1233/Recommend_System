package com.example.ecommerce.enums;

public enum CartStatus {
    ACTIVE,      // Giỏ hàng hiện tại đang mở, user đang xem và thêm bớt đồ bình thường
    PENDING,     // Giỏ hàng đang chờ xử lý (User đã bấm nút "Tiến hành thanh toán" nhưng chưa trả tiền xong)
    COMPLETED,   // Giỏ hàng đã thanh toán thành công (Lúc này hệ thống sẽ chốt đơn và tạo ra Order)
    CANCELED     // Giỏ hàng bị hủy bỏ (Ví dụ: User bấm hủy trong quá trình thanh toán)
}