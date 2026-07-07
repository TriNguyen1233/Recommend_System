package com.example.ecommerce.enums;

public enum ProductStatus {
    DRAFT,       // Hàng nháp, chưa muốn cho khách xem
    ACTIVE,      // Đang hiển thị và mở bán công khai
    OUT_OF_STOCK,// Hết hàng (tạm thời không cho bỏ vào giỏ hàng)
    ARCHIVED     // Đã ẩn/xóa mềm, không kinh doanh nữa
}
