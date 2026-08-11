import { useEffect, useRef, useState } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import toast, { Toaster } from "react-hot-toast";

import Header from "../components/Header.tsx";
import "../css/App.css";
import axios from "axios";

// Interface định nghĩa kiểu dữ liệu Order trả về từ Backend
interface OrderResponse {
    id: number;
    userId: string;
    totalPrice?: number;
    status: string;
    createdAt?: string;
}

function OrderConfirmationPage() {
    const pageRef = useRef<HTMLDivElement | null>(null);
    const badgeRef = useRef<HTMLDivElement | null>(null);
    const cardRef = useRef<HTMLDivElement | null>(null);
    const hasCheckedOut = useRef(false); // Ngăn việc gọi API 2 lần do React StrictMode

    const [searchParams] = useSearchParams();

    // 1. Trích xuất tham số từ URL
    // Giả sử userId lấy từ URL, hoặc có thể lấy từ localStorage/AuthContext
    const user = localStorage.getItem("user")
    let userId = ""
    if (user) {
        try {
            const jsonUser = JSON.parse(user);
            userId = jsonUser?.id || "";
        } catch (error) {
            console.error("Lỗi parse JSON người dùng từ localStorage:", error);
        }
    }
    const paymentStatus = searchParams.get("paymentStatus") || searchParams.get("status") || "success";
    const amountParam = searchParams.get("amount");
    const responseCode = searchParams.get("code") || searchParams.get("vnp_ResponseCode");

    const isSuccess = paymentStatus === "success" || responseCode === "00";

    // State lưu trữ dữ liệu Đơn hàng sau khi gọi API cartToOrder thành công
    const [order, setOrder] = useState<OrderResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(isSuccess);
    const [error, setError] = useState<string | null>(null);

    // 2. GỌI API CHUYỂN CART THÀNH ORDER KHI THANH TOÁN THÀNH CÔNG
    useEffect(() => {
        if (isSuccess && userId && !hasCheckedOut.current) {
            hasCheckedOut.current = true;

            const processCheckout = async () => {
                try {
                    setLoading(true);

                    // Thêm http:// vào đầu URL
                    const response = await axios.post<OrderResponse>(
                        `http://localhost:8080/api/orders/checkout/${userId}`
                    );

                    setOrder(response.data);
                    toast.success("Order created and payment completed successfully!", {
                        duration: 2000
                    });
                } catch (err: any) {
                    console.error("Checkout error:", err);

                    const errorMessage =
                        err.response?.data?.message ||
                        err.response?.data ||
                        err.message ||
                        "An error occurred during checkout";

                    setError(errorMessage);
                    toast.error("Failed to convert cart to order.");
                } finally {
                    setLoading(false);
                }
            };

            processCheckout();
        } else if (!isSuccess) {
            toast.error("Payment was cancelled or failed.");
            setLoading(false);
        }
    }, [isSuccess, userId]);
    useGSAP(() => {
        gsap.from(".header-animate", {
            y: -20,
            opacity: 0,
            duration: 0.5,
            stagger: 0.1,
            ease: "power2.out",
        });

        if (badgeRef.current) {
            gsap.fromTo(
                badgeRef.current,
                { scale: 0.3, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.7)", delay: 0.2 }
            );
        }

        if (cardRef.current) {
            gsap.fromTo(
                cardRef.current,
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.5, ease: "power2.out", delay: 0.3 }
            );
        }
    }, { scope: pageRef, dependencies: [loading] });

    const formattedDate = new Date().toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    });

    return (
        <div ref={pageRef} style={{ backgroundColor: "#ffffff", minHeight: "100vh", paddingBottom: "60px" }}>
            <Toaster position="top-right" reverseOrder={false} />

            <Header />

            {/* BREADCRUMB */}
            <div style={{ padding: "15px 50px", background: "#f8f9fa", borderBottom: "1px solid #e9ecef", fontSize: "14px", color: "#6c757d" }}>
                <NavLink to="/" style={{ color: "#0d6efd", textDecoration: "none" }}>Home</NavLink> /
                <NavLink to="/cart" style={{ color: "#0d6efd", textDecoration: "none", marginLeft: "6px" }}> Shopping Cart</NavLink> /
                <strong style={{ color: "#333", marginLeft: "8px" }}>Order Confirmation</strong>
            </div>

            <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px" }}>

                {/* HEADING SECTION */}
                <div className="header-animate" style={{ textAlign: "center", marginBottom: "35px" }}>

                    {/* STATUS BADGE ICON */}
                    <div
                        ref={badgeRef}
                        style={{
                            width: "80px",
                            height: "80px",
                            borderRadius: "50%",
                            backgroundColor: isSuccess && !error ? "#e8f5e9" : "#ffebee",
                            color: isSuccess && !error ? "#2e7d32" : "#c62828",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 20px auto",
                            boxShadow: isSuccess && !error ? "0 4px 15px rgba(46, 125, 50, 0.15)" : "0 4px 15px rgba(198, 40, 40, 0.15)",
                        }}
                    >
                        {isSuccess && !error ? (
                            <svg width="42" height="42" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                            </svg>
                        ) : (
                            <svg width="42" height="42" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                            </svg>
                        )}
                    </div>

                    <h1 style={{ fontSize: "30px", fontWeight: "800", color: "#111", marginBottom: "8px" }}>
                        {loading
                            ? "Processing Your Order..."
                            : isSuccess && !error
                                ? "Thank You for Your Order!"
                                : "Payment Unsuccessful"}
                    </h1>
                    <p style={{ color: "#6c757d", fontSize: "16px", margin: 0 }}>
                        {loading
                            ? "Please wait while we finalize your purchase."
                            : isSuccess && !error
                                ? "We have converted your cart into a confirmed order. A receipt has been generated."
                                : error || "Your order could not be processed due to a payment issue or cancellation."}
                    </p>
                </div>

                {/* ORDER RECEIPT CARD */}
                <div
                    ref={cardRef}
                    style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        border: "1px solid #e0e0e0",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                        padding: "35px",
                    }}
                >
                    <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#111", marginBottom: "20px", borderBottom: "2px solid #f1f3f5", paddingBottom: "12px" }}>
                        Transaction Summary
                    </h2>

                    {loading ? (
                        <div style={{ textAlign: "center", padding: "20px", color: "#6c757d" }}>
                            Creating order...
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "15px" }}>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ color: "#6c757d" }}>Order ID</span>
                                <span style={{ fontWeight: "700", color: "#111", fontFamily: "monospace", fontSize: "16px" }}>
                                    {order?.id ? `#${order.id}` : searchParams.get("orderId") || "N/A"}
                                </span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ color: "#6c757d" }}>Date & Time</span>
                                <span style={{ fontWeight: "600", color: "#333" }}>{formattedDate}</span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ color: "#6c757d" }}>Payment Gateway</span>
                                <span style={{ fontWeight: "600", color: "#333" }}>VNPay Gateway</span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ color: "#6c757d" }}>Order Status</span>
                                <span
                                    style={{
                                        fontWeight: "700",
                                        color: isSuccess && !error ? "#198754" : "#dc3545",
                                        backgroundColor: isSuccess && !error ? "#e8f5e9" : "#ffebee",
                                        padding: "4px 12px",
                                        borderRadius: "20px",
                                        fontSize: "13px",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    {order?.status || (isSuccess ? "Paid" : `Failed (${responseCode || "CANCELLED"})`)}
                                </span>
                            </div>

                            {(amountParam || order?.totalPrice) && (
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ color: "#6c757d" }}>Total Amount</span>
                                    <span style={{ fontWeight: "700", color: "#111" }}>
                                        {Number(order?.totalPrice || amountParam).toLocaleString()} VND
                                    </span>
                                </div>
                            )}

                        </div>
                    )}

                    <hr style={{ border: "none", borderTop: "1px solid #e9ecef", margin: "25px 0" }} />

                    {/* ACTION BUTTONS */}
                    <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
                        <NavLink
                            to="/"
                            style={{
                                flex: 1,
                                textAlign: "center",
                                padding: "12px 20px",
                                borderRadius: "6px",
                                backgroundColor: "#0d6efd",
                                color: "#ffffff",
                                fontWeight: "bold",
                                textDecoration: "none",
                                fontSize: "15px",
                            }}
                        >
                            Continue Shopping
                        </NavLink>

                        {(!isSuccess || error) && (
                            <NavLink
                                to="/cart"
                                style={{
                                    flex: 1,
                                    textAlign: "center",
                                    padding: "12px 20px",
                                    borderRadius: "6px",
                                    border: "1px solid #ced4da",
                                    backgroundColor: "#ffffff",
                                    color: "#212529",
                                    fontWeight: "bold",
                                    textDecoration: "none",
                                    fontSize: "15px",
                                }}
                            >
                                Return to Cart
                            </NavLink>
                        )}
                    </div>

                </div>

            </div>
        </div>
    );
}

export default OrderConfirmationPage;