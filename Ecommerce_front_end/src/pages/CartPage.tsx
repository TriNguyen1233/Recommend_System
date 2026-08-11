import { useEffect, useState, useRef } from "react";
import { NavLink } from "react-router-dom";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import axios from "axios";
import toast, { Toaster } from 'react-hot-toast';

import Header from "../components/Header.tsx";
import "../css/App.css";

const toastWarn = (message: string) => {
    toast(message, {
        icon: '⚠️',
        style: {
            border: '1px solid #ffc107',
            padding: '12px',
            color: '#856404',
            backgroundColor: '#fff3cd',
        },
    });
};

interface Product {
    asin?: string;
    title?: string;
    price?: number | string;
    image?: string;
    description?: string;
}

interface CartItem {
    id?: number;
    cartItemId?: number;
    asin?: string;
    parent_asin?: string;
    title?: string;
    price?: number | string;
    image_url?: string;
    quantity: number;
    product?: Product;
}

// Helper giúp trích xuất danh sách cart items an toàn từ mọi kiểu Response Backend
const parseCartResponse = (data: any): CartItem[] | null => {
    if (!data) return null;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.cartItems)) return data.cartItems;
    if (Array.isArray(data.items)) return data.items;
    return null;
};

function CartPage() {
    const pageRef = useRef<HTMLDivElement | null>(null);
    const cartListRef = useRef<HTMLDivElement | null>(null);

    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [isCheckoutLoading, setIsCheckoutLoading] = useState<boolean>(false);

    // Lấy userId và token tiện ích
    const getAuthData = () => {
        const token = localStorage.getItem("jwtToken");
        let userId = '';
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                userId = parsedUser?.userId || parsedUser?.id || parsedUser?._id || '';
            }
        } catch (error) {
            console.error("Error parsing user:", error);
        }
        return { token, userId };
    };

    // Ép kiểu giá tiền về dạng number an toàn
    const safePrice = (val?: number | string): number => {
        if (typeof val === 'number') return isNaN(val) ? 0 : val;
        if (typeof val === 'string') {
            const parsed = parseFloat(val.replace('$', ''));
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    };

    // 1. FETCH CART DATA
    const fetchCart = async () => {
        try {
            setLoading(true);
            const { token, userId } = getAuthData();

            if (!userId) {
                toastWarn("Not logged in!");
                setCartItems([]);
                return;
            }

            const response = await axios.get("http://localhost:8080/api/cart", {
                params: { userId },
                headers: { Authorization: token ? `Bearer ${token}` : '' }
            });

            const items = parseCartResponse(response.data) || [];
            console.log("Cart Items:", items);
            setCartItems(items);
        } catch (error: any) {
            console.error("Error fetching cart:", error);
            const errMsg = error.response?.data?.message || "Cannot connect to server.";
            toastWarn(errMsg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCart();
    }, []);

    // GSAP Animations cho Header
    useGSAP(() => {
        gsap.from(".header-animate", {
            y: -20,
            opacity: 0,
            duration: 0.5,
            stagger: 0.1,
            ease: "power2.out"
        });
    }, { scope: pageRef });

    // GSAP Animations cho danh sách sản phẩm
    useEffect(() => {
        if (cartListRef.current && cartItems.length > 0 && !loading) {
            gsap.fromTo(
                cartListRef.current.children,
                { y: 25, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: "power2.out" }
            );
        }
    }, [cartItems.length, loading]);

    // 2. XỬ LÝ THAY ĐỔI SỐ LƯỢNG
    const handleQuantityChange = async (item: CartItem, newQuantity: number) => {
        if (newQuantity <= 0) {
            handleRemoveItem(item);
            return;
        }

        const itemAsin = item.asin || item.product?.asin || item.parent_asin;
        if (!itemAsin) {
            toast.error("Invalid product identifier!");
            return;
        }

        const { token, userId } = getAuthData();
        if (!userId) {
            toast.error("You are not logged in!");
            return;
        }

        const previousItems = [...cartItems];

        // Optimistic UI update
        setCartItems(prev =>
            prev.map(i => {
                const currentAsin = i.asin || i.product?.asin || i.parent_asin;
                return currentAsin === itemAsin ? { ...i, quantity: newQuantity } : i;
            })
        );

        try {
            const response = await axios.put("http://localhost:8080/api/cart/update", null, {
                params: {
                    userId: userId,
                    asin: itemAsin,
                    quantity: newQuantity
                },
                headers: { 
                    Authorization: token ? `Bearer ${token}` : '' 
                }
            });

            const updatedItems = parseCartResponse(response.data);
            if (updatedItems) {
                setCartItems(updatedItems);
            }

            toast.success("Quantity updated!");
        } catch (error: any) {
            console.error("Failed to update quantity:", error);
            setCartItems(previousItems);
            const errMsg = error.response?.data?.message || "Failed to sync with server.";
            toast.error(`Update failed: ${errMsg}`);
        }
    };

    // 3. XỬ LÝ XÓA SẢN PHẨM BẰNG cartItemId HOẶC id
    const handleRemoveItem = async (item: CartItem) => {
        const cartItemId = item.id || item.cartItemId;
        if (!cartItemId) {
            toast.error("Invalid cart item ID!");
            return;
        }

        const { token, userId } = getAuthData();
        if (!userId) {
            toast.error("You are not logged in!");
            return;
        }

        const previousItems = [...cartItems];

        setCartItems(prev => prev.filter(i => (i.id || i.cartItemId) !== cartItemId));

        try {
            const response = await axios.delete(`http://localhost:8080/api/cart/remove/${cartItemId}`, {
                params: { userId: userId },
                headers: { 
                    Authorization: token ? `Bearer ${token}` : '' 
                }
            });

            const updatedItems = parseCartResponse(response.data);
            if (updatedItems) {
                setCartItems(updatedItems);
            }

            toast.success("Item removed from cart!");
        } catch (error: any) {
            console.error("Failed to remove item:", error);
            setCartItems(previousItems);
            const errMsg = error.response?.data?.message || "Failed to remove item on server.";
            toast.error(`Remove failed: ${errMsg}`);
        }
    };

    // Tính toán tổng số tiền
    const subtotal = cartItems.reduce((acc, item) => {
        const unitPrice = safePrice(item.product?.price ?? item.price);
        return acc + (unitPrice * item.quantity);
    }, 0);

    const shippingFee = cartItems.length > 0 ? 15.00 : 0;
    const totalAmount = subtotal + shippingFee;

    // 4. XỬ LÝ THANH TOÁN VNPAY
    const handleCheckout = async () => {
        if (cartItems.length === 0) {
            toastWarn("Your cart is empty!");
            return;
        }

        const { token, userId } = getAuthData();
        if (!userId) {
            toastWarn("Please log in to proceed with payment!");
            return;
        }

        try {
            setIsCheckoutLoading(true);

            // Tạo orderId duy nhất dựa theo mã timestamp
            const orderId = `ORDER_${Date.now()}`;
            
            // Chuyển đổi số tiền thành số nguyên cho VNPay (Quy đổi USD ra VND nếu dùng USD, hoặc giữ nguyên số nguyên)
            const paymentAmount = Math.round(totalAmount * 25000); // 1 USD = 25,000 VND (Thay đổi tỷ giá tùy hệ thống)

            const response = await axios.get("http://localhost:8080/api/payments/create", {
                params: {
                    orderId: orderId,
                    amount: paymentAmount
                },
                headers: {
                    Authorization: token ? `Bearer ${token}` : ''
                }
            });

            if (response.data && response.data.paymentUrl) {
                toast.success("Redirecting to VNPay payment gateway...");
                window.location.href = response.data.paymentUrl;
            } else {
                toast.error("Failed to get payment URL.");
            }
        } catch (error: any) {
            console.error("Checkout payment error:", error);
            const errMsg = error.response?.data?.message || "Could not initialize payment.";
            toast.error(`Checkout error: ${errMsg}`);
        } finally {
            setIsCheckoutLoading(false);
        }
    };

    return (
        <div ref={pageRef} style={{ backgroundColor: '#ffffff', minHeight: '100vh', paddingBottom: '50px' }}>
            <Toaster position="top-right" reverseOrder={false} />

            <Header />

            {/* BREADCRUMB */}
            <div style={{ padding: '15px 50px', background: '#f8f9fa', borderBottom: '1px solid #e9ecef', fontSize: '14px', color: '#6c757d' }}>
                <NavLink to="/" style={{ color: '#0d6efd', textDecoration: 'none' }}>Home</NavLink> /
                <strong style={{ color: '#333', marginLeft: '8px' }}>Your Shopping Cart</strong>
            </div>

            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' }}>

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
                                {cartItems.map((item, index) => {
                                    const title = item.product?.title || item.title || "Product Item";
                                    const image = item.product?.image || item.image_url || "https://via.placeholder.com/80";
                                    const asin = item.product?.asin || item.asin || item.parent_asin || "";
                                    const itemId = item.id || item.cartItemId;
                                    const unitPrice = safePrice(item.product?.price ?? item.price);
                                    const itemTotal = unitPrice * item.quantity;

                                    return (
                                        <div key={itemId || asin || index} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '15px',
                                            border: '1px solid #e0e0e0',
                                            borderRadius: '8px',
                                            backgroundColor: '#fafafa'
                                        }}>
                                            {/* Ảnh & Tên sản phẩm */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', width: '50%' }}>
                                                <img
                                                    src={image}
                                                    alt={title}
                                                    style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '6px' }}
                                                />
                                                <div>
                                                    <NavLink to={asin ? `/products/${asin}` : "#"} style={{ textDecoration: 'none', color: '#111', fontWeight: 'bold', fontSize: '15px' }}>
                                                        {title}
                                                    </NavLink>
                                                    <div style={{ color: '#6c757d', fontSize: '14px', marginTop: '4px' }}>
                                                        ${unitPrice.toFixed(2)}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bộ điều chỉnh số lượng */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <button
                                                    onClick={() => handleQuantityChange(item, item.quantity - 1)}
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
                                                    onClick={() => handleQuantityChange(item, item.quantity + 1)}
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

                                            {/* Thành tiền */}
                                            <div style={{ fontWeight: '800', color: '#111', minWidth: '80px', textAlign: 'right' }}>
                                                ${itemTotal.toFixed(2)}
                                            </div>

                                            {/* Nút Xóa */}
                                            <button
                                                onClick={() => handleRemoveItem(item)}
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

                        {/* TỔNG QUAN ĐƠN HÀNG */}
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

                            <button
                                onClick={handleCheckout}
                                disabled={isCheckoutLoading}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: isCheckoutLoading ? '#6c757d' : '#0d6efd',
                                    color: '#ffffff',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: isCheckoutLoading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {isCheckoutLoading ? 'Processing Payment...' : 'Checkout with VNPay'}
                            </button>
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
}

export default CartPage;