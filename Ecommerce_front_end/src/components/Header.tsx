import axios from "axios";
import { useEffect, useState, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useCart } from "../context/CartContext";

// Link ảnh avatar mặc định khi không có avatar hoặc ảnh bị lỗi
const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

interface UserProfile {
    id?: string;
    userId?: string;
    username?: string;
    email?: string;
    fullName?: string;
    avatar?: string;
}

const Header = () => {
    const { cartItemCount, setCartItemCount } = useCart();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const navigate = useNavigate();

    // Hàm đọc User từ localStorage & Lấy số lượng giỏ hàng từ API
    const fetchUserDataAndCart = async () => {
        const userRaw = localStorage.getItem("user");
        const jwtToken = localStorage.getItem("jwtToken");

        // 1. LẤY TRỰC TIẾP TỪ LOCALSTORAGE (Không gọi API lấy User nữa)
        if (userRaw) {
            try {
                const userObj: UserProfile = JSON.parse(userRaw);
                console.log("User data from localStorage:", userObj);
                setUser(userObj);

                // 2. CHỈ GỌI API LẤY SỐ LƯỢNG GIỎ HÀNG (Nếu có token và userId)
                const userId = userObj.userId || userObj.id;
                if (jwtToken && userId) {
                    const cartResponse = await axios.get(
                        "http://localhost:8080/api/cart/count",
                        {
                            params: { userId: userId },
                            headers: {
                                Authorization: `Bearer ${jwtToken}`,
                            },
                        }
                    );

                    if (cartResponse && cartResponse.data !== undefined) {
                        setCartItemCount(cartResponse.data ?? 0);
                    }
                }
            } catch (error) {
                console.error("Lỗi khi đọc user từ localStorage hoặc lấy Cart count:", error);
            }
        } else {
            setUser(null);
        }
    };

    useEffect(() => {
        fetchUserDataAndCart();

        // Lắng nghe sự kiện khi Profile cập nhật dữ liệu vào localStorage
        const handleUserUpdate = () => {
            const updatedUserRaw = localStorage.getItem("user");
            if (updatedUserRaw) {
                try {
                    setUser(JSON.parse(updatedUserRaw));
                } catch (e) {
                    console.error("Lỗi khi đọc JSON từ localStorage:", e);
                }
            } else {
                setUser(null);
            }
        };

        window.addEventListener("user-updated", handleUserUpdate);
        window.addEventListener("storage", handleUserUpdate);

        return () => {
            window.removeEventListener("user-updated", handleUserUpdate);
            window.removeEventListener("storage", handleUserUpdate);
        };
    }, []);

    // Tự động đóng Menu khi click ra ngoài màn hình
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Xử lý đăng xuất
    const handleLogout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("jwtToken");
        setUser(null);
        setIsMenuOpen(false);

        toast.success("Logged out successfully!", {
            duration: 2000,
        });

        navigate("/login");
    };

    return (
        <div style={{ position: "sticky", top: 0, zIndex: 10, height: "70px" }}>
            {/* NAVBAR */}
            <div className="navbar" style={{
                height: "100%",
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                padding: '0 30px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                {/* Logo */}
                <div className='logo' style={{ color: '#0d6efd', fontWeight: 'bold', fontSize: '22px' }}>
                    <Link to="/" style={{ color: '#0d6efd', textDecoration: 'none' }}>TechStore</Link>
                </div>

                {/* Navigation Links */}
                <div className='navheader' style={{ display: 'flex', gap: '25px' }}>
                    <NavLink to="/" style={({ isActive }) => ({ color: isActive ? '#0d6efd' : '#495057', textDecoration: 'none', fontWeight: isActive ? 'bold' : 'normal' })}>Home</NavLink>
                    <NavLink to="/products" style={({ isActive }) => ({ color: isActive ? '#0d6efd' : '#495057', textDecoration: 'none', fontWeight: isActive ? 'bold' : 'normal' })}>Products</NavLink>
                    <NavLink to="/specifications" style={({ isActive }) => ({ color: isActive ? '#0d6efd' : '#495057', textDecoration: 'none', fontWeight: isActive ? 'bold' : 'normal' })}>Specifications</NavLink>
                    <NavLink to="/contact" style={({ isActive }) => ({ color: isActive ? '#0d6efd' : '#495057', textDecoration: 'none', fontWeight: isActive ? 'bold' : 'normal' })}>About Us</NavLink>
                </div>

                {/* Action Icons (Cart + Avatar) */}
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>

                    {/* CART ICON */}
                    <div style={{ width: "40px", height: "40px", position: "relative", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {cartItemCount > 0 && (
                            <div style={{
                                position: "absolute",
                                zIndex: 2,
                                background: "#dc3545",
                                color: "white",
                                fontSize: "11px",
                                fontWeight: "bold",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "18px",
                                height: "18px",
                                borderRadius: "50%",
                                top: "-2px",
                                right: "-2px"
                            }}>
                                {cartItemCount}
                            </div>
                        )}
                        <Link to="/cart" style={{ display: 'flex', alignItems: 'center' }}>
                            <svg
                                className="CartNav"
                                style={{ fill: "#333", width: "28px", height: "28px", cursor: "pointer" }}
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 640 640"
                            >
                                <path d="M24 48C10.7 48 0 58.7 0 72C0 85.3 10.7 96 24 96L69.3 96C73.2 96 76.5 98.8 77.2 102.6L129.3 388.9C135.5 423.1 165.3 448 200.1 448L456 448C469.3 448 480 437.3 480 424C480 410.7 469.3 400 456 400L200.1 400C188.5 400 178.6 391.7 176.5 380.3L171.4 352L475 352C505.8 352 532.2 330.1 537.9 299.8L568.9 133.9C572.6 114.2 557.5 96 537.4 96L124.7 96L124.3 94C119.5 67.4 96.3 48 69.2 48L24 48zM208 576C234.5 576 256 554.5 256 528C256 501.5 234.5 480 208 480C181.5 480 160 501.5 160 528C160 554.5 181.5 576 208 576zM432 576C458.5 576 480 554.5 480 528C480 501.5 458.5 480 432 480C405.5 480 384 501.5 384 528C384 554.5 405.5 576 432 576z" />
                            </svg>
                        </Link>
                    </div>

                    {/* AVATAR USER + DROPDOWN */}
                    <div ref={dropdownRef} style={{ position: "relative" }}>
                        <div
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            style={{
                                width: "38px",
                                height: "38px",
                                borderRadius: "50%",
                                backgroundColor: "#f0f0f0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                overflow: "hidden",
                                border: "2px solid #e0e0e0"
                            }}
                        >
                            <img
                                src={user?.avatar || DEFAULT_AVATAR}
                                alt="User Avatar"
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover"
                                }}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                                }}
                            />
                        </div>

                        {/* DROPDOWN MENU */}
                        {isMenuOpen && (
                            <div style={{
                                position: "absolute",
                                right: 0,
                                top: "50px",
                                width: "200px",
                                backgroundColor: "#ffffff",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                borderRadius: "8px",
                                padding: "10px 0",
                                zIndex: 100,
                                border: "1px solid #e0e0e0"
                            }}>
                                <div style={{ padding: "10px 16px", borderBottom: "1px solid #eee" }}>
                                    <p style={{ margin: 0, fontWeight: "bold", fontSize: "14px", color: "#333" }}>
                                        {user?.fullName || user?.username || "Guest User"}
                                    </p>
                                    <p style={{ margin: 0, fontSize: "12px", color: "#6c757d", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {user?.email || ""}
                                    </p>
                                </div>

                                <Link
                                    to="/profile"
                                    onClick={() => setIsMenuOpen(false)}
                                    style={{
                                        display: "block",
                                        padding: "10px 16px",
                                        color: "#333",
                                        textDecoration: "none",
                                        fontSize: "14px"
                                    }}
                                >
                                    My Profile
                                </Link>

                                <div
                                    onClick={handleLogout}
                                    style={{
                                        padding: "10px 16px",
                                        color: "#dc3545",
                                        fontSize: "14px",
                                        fontWeight: "bold",
                                        cursor: "pointer",
                                        borderTop: "1px solid #eee"
                                    }}
                                >
                                    Logout
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Header;