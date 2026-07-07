package com.example.ecommerce.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.example.ecommerce.enums.OrderStatus; // Giả định bạn có enum OrderStatus

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Order {

    @Id
    @Column(name = "order_id")
    @GeneratedValue(strategy=GenerationType.IDENTITY)
    private int Id; // Để kiểu String theo như sơ đồ của bạn

    // Mối quan hệ 1-N với OrderItem (mappedBy trỏ đến biến 'order' trong class OrderItem)
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<OrderItem> orderItemList;

    // Giả định liên kết qua ID người dùng dạng String (hoặc bạn có thể map trực tiếp @ManyToOne với entity User nếu cần)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // Thêm mối quan hệ với User nếu cần thiết, hoặc chỉ lưu userId dưới dạng String

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Thay thế float bằng BigDecimal để tránh sai số khi tính tổng tiền hóa đơn
    @Column(name = "total_price", nullable = false)
    private BigDecimal totalPrice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status; // Enum quản lý trạng thái đơn hàng (ví dụ: PENDING, SHIPPING, DELIVERED, CANCELLED)
}