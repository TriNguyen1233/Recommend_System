import { useEffect, useState, useRef } from "react";
import { NavLink } from "react-router-dom";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import axios from "axios";

import Header from "../components/Header.tsx";
import "../css/App.css";

// Interface định nghĩa phần tử trong giỏ hàng
interface CartItem {
    id: string | number;
    parent_asin?: string;
    title?: string;
    price?: number | string;
    image_url?: string;
    quantity: number;
}

// -------------------------------------------------------------
// DATA SEED (MOCK DATA)
// -------------------------------------------------------------
const MOCK_CART_SEED: CartItem[] = [
    {
        id: 101,
        parent_asin: "B08N5WRWNW",
        title: "Sony WH-1000XM4 Wireless Noise Cancelling Headphones",
        price: 348.00,
        image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80",
        quantity: 1
    },
    {
        id: 102,
        parent_asin: "B07X6C9RMF",
        title: "Logitech MX Master 3S Wireless Performance Mouse",
        price: 99.99,
        image_url: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500&q=80",
        quantity: 2
    },
    {
        id: 103,
        parent_asin: "B0912ABCDE",
        title: "Keychron K2 Wireless Mechanical Keyboard (RGB)",
        price: 89.90,
        image_url: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&q=80",
        quantity: 1
    }
];

function CartPage() {
    const pageRef = useRef<HTMLDivElement | null>(null);
    const cartListRef = useRef<HTMLDivElement | null>(null);

    // States cho dữ liệu API & Loading
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // 1. Fetch danh sách giỏ hàng từ API Spring Boot (Fallback về Mock Data nếu lỗi)
    useEffect(() => {
        let isMounted = true;

        const fetchCart = async () => {
            try {
                setLoading(true);
                const response = await axios.get("http://localhost:8080/api/cart", {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("jwtToken")}`
                    }
                });

                if (!isMounted) return;

                console.log("Cart response data:", response.data);

                // Xử lý dữ liệu giỏ hàng trả về từ Backend
                if (Array.isArray(response.data) && response.data.length > 0) {
                    setCartItems(response.data);
                } else if (response.data.items && response.data.items.length > 0) {
                    setCartItems(response.data.items);
                } else {
                    // Nếu backend trả về mảng rỗng -> Dùng seed data để test
                    setCartItems(MOCK_CART_SEED);
                }
            } catch (error) {
                if (isMounted) {
                    console.warn("Backend unavailable. Using Mock Data Seed instead.", error);
                    // Khi API lỗi hoặc chưa mở Backend, tự động dùng mock data
                    setCartItems(MOCK_CART_SEED);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchCart();

        return () => {
            isMounted = false;
        };
    }, []);

    // 2. Hiệu ứng GSAP khi load giao diện lần đầu
    useGSAP(() => {
        gsap.from(".header-animate", {
            y: -20,
            opacity: 0,
            duration: 0.5,
            stagger: 0.1,
            ease: "power2.out"
        });
    }, { scope: pageRef });

    // 3. Hiệu ứng GSAP xuất hiện danh sách giỏ hàng khi load xong
    useEffect(() => {
        if (cartListRef.current && cartItems.length > 0 && !loading) {
            gsap.fromTo(
                cartListRef.current.children,
                { y: 25, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: "power2.out" }
            );
        }
    }, [cartItems, loading]);

    // Thao tác cập nhật số lượng sản phẩm
    const handleQuantityChange = async (itemId: string | number, newQuantity: number) => {
        if (newQuantity <= 0) return;

        // Cập nhật State UI lập tức
        setCartItems(prev =>
            prev.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item)
        );

        try {
            await axios.put(`http://localhost:8080/api/cart/items/${itemId}`, 
                { quantity: newQuantity },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("jwtToken")}`
                    }
                }
            );
        } catch (error) {
            console.error("Error updating item quantity (UI updated locally):", error);
        }
    };

    // Thao tác xóa sản phẩm khỏi giỏ hàng
    const handleRemoveItem = async (itemId: string | number) => {
        // Cập nhật State UI loại bỏ item ngay
        setCartItems(prev => prev.filter(item => item.id !== itemId));

        try {
            await axios.delete(`http://localhost:8080/api/cart/items/${itemId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("jwtToken")}`
                }
            });
        } catch (error) {
            console.error("Error removing cart item (UI updated locally):", error);
        }
    };

    // Tính toán tổng tiền
    const subtotal = cartItems.reduce((acc, item) => {
        const itemPrice = typeof item.price === "number" ? item.price : parseFloat(item.price || "0");
        return acc + itemPrice * item.quantity;
    }, 0);

    const shippingFee = cartItems.length > 0 ? 15.00 : 0;
    const totalAmount = subtotal + shippingFee;

    return (
        <div ref={pageRef} style={{ backgroundColor: '#ffffff', minHeight: '100vh', paddingBottom: '50px' }}>
            <Header />

            {/* BREADCRUMB */}
            <div style={{ padding: '15px 50px', background: '#f8f9fa', borderBottom: '1px solid #e9ecef', fontSize: '14px', color: '#6c757d' }}>
                <NavLink to="/" style={{ color: '#0d6efd', textDecoration: 'none' }}>Home</NavLink> /
                <strong style={{ color: '#333', marginLeft: '8px' }}>Your Shopping Cart</strong>
            </div>

            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' }}>

                {/* TIÊU ĐỀ TRANG */}
                <div className="header-animate" style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#111', marginBottom: '10px' }}>
                        Your Cart Summary
                    </h1>
                    <p style={{ color: '#6c757d', fontSize: '16px' }}>
                        Review your selected items before completing your purchase.
                    </p>
                </div>

                {loading ? (
                    <div className="neon-spinner-container" style={{ textAlign: 'center', padding: '60px 20px', color: '#6c757d' }}>
                        <div className="neon-spinner"></div>
                        <p style={{ marginTop: '15px' }}>Loading cart items...</p>
                    </div>
                ) : cartItems.length === 0 ? (
                    /* EMPTY CART STATE */
                    <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e0e0e0',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                    }}>
                        <h2 style={{ fontSize: '24px', color: '#333', marginBottom: '10px' }}>Your cart is empty</h2>
                        <p style={{ color: '#6c757d', marginBottom: '20px' }}>Looks like you haven't added anything to your cart yet.</p>
                        <NavLink to="/" style={{
                            padding: '12px 24px',
                            backgroundColor: '#0d6efd',
                            color: '#ffffff',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontWeight: 'bold',
                            display: 'inline-block'
                        }}>
                            Continue Shopping
                        </NavLink>
                    </div>
                ) : (
                    /* BỐ CỤC GIỎ HÀNG VÀ THANH TOÁN */
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '30px' }}>

                        {/* DANH SÁCH SẢN PHẨM */}
                        <div style={{
                            background: '#ffffff',
                            padding: '30px',
                            borderRadius: '12px',
                            border: '1px solid #e0e0e0',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f1f3f5', paddingBottom: '15px' }}>
                                <h2 style={{ fontSize: '20px', color: '#333', margin: 0 }}>
                                    Cart Items ({cartItems.length})
                                </h2>
                            </div>

                            <div ref={cartListRef} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {cartItems.map(item => {
                                    const unitPrice = typeof item.price === "number" ? item.price : parseFloat(item.price || "0");
                                    
                                    return (
                                        <div key={item.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '15px',
                                            border: '1px solid #e0e0e0',
                                            borderRadius: '8px',
                                            backgroundColor: '#fafafa'
                                        }}>
                                            {/* Ảnh và thông tin */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', width: '50%' }}>
                                                <img 
                                                    src={item.image_url || "https://via.placeholder.com/80"} 
                                                    alt={item.title} 
                                                    style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '6px' }} 
                                                />
                                                <div>
                                                    <NavLink to={`/product/${item.parent_asin}`} style={{ textDecoration: 'none', color: '#111', fontWeight: 'bold', fontSize: '15px' }}>
                                                        {item.title || "Product Item"}
                                                    </NavLink>
                                                    <div style={{ color: '#6c757d', fontSize: '14px', marginTop: '4px' }}>
                                                        ${unitPrice.toFixed(2)}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Số lượng */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <button
                                                    onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                                    style={{
                                                        width: '28px',
                                                        height: '28px',
                                                        borderRadius: '4px',
                                                        border: '1px solid #ccc',
                                                        backgroundColor: '#fff',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    -
                                                </button>
                                                <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                                    style={{
                                                        width: '28px',
                                                        height: '28px',
                                                        borderRadius: '4px',
                                                        border: '1px solid #ccc',
                                                        backgroundColor: '#fff',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    +
                                                </button>
                                            </div>

                                            {/* Tổng tiền thành phần */}
                                            <div style={{ fontWeight: '800', color: '#111', minWidth: '80px', textAlign: 'right' }}>
                                                ${(unitPrice * item.quantity).toFixed(2)}
                                            </div>

                                            {/* Nút xóa */}
                                            <button
                                                onClick={() => handleRemoveItem(item.id)}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: '#dc3545',
                                                    cursor: 'pointer',
                                                    fontSize: '18px',
                                                    fontWeight: 'bold',
                                                    marginLeft: '10px'
                                                }}
                                                title="Remove item"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* BẢNG TÓM TẮT ĐƠN HÀNG (SUMMARY) */}
                        <div style={{
                            background: '#ffffff',
                            padding: '25px',
                            borderRadius: '12px',
                            border: '1px solid #e0e0e0',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                            height: 'fit-content'
                        }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111', marginBottom: '20px', borderBottom: '2px solid #f1f3f5', paddingBottom: '10px' }}>
                                Order Summary
                            </h3>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#6c757d', fontSize: '15px' }}>
                                <span>Subtotal</span>
                                <span style={{ color: '#111', fontWeight: '600' }}>${subtotal.toFixed(2)}</span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#6c757d', fontSize: '15px' }}>
                                <span>Estimated Shipping</span>
                                <span style={{ color: '#111', fontWeight: '600' }}>${shippingFee.toFixed(2)}</span>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid #e9ecef', margin: '15px 0' }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '18px' }}>
                                <strong style={{ color: '#111' }}>Total</strong>
                                <strong style={{ color: '#0d6efd' }}>${totalAmount.toFixed(2)}</strong>
                            </div>

                            <button style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: '#0d6efd',
                                color: '#ffffff',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}>
                                Checkout
                            </button>
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
}

export default CartPage;