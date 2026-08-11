import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import AdminHeader from "../../components/AdminHeader";
import NotPermittedPage from "../NotPermitPage";

export default function AdminLayout() {
    const navigate = useNavigate();
    const [adminName, setAdminName] = useState<string>("Admin");
    
    // State kiểm tra trạng thái phân quyền (null: đang kiểm tra, true: hợp lệ, false: không có quyền)
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        const token = localStorage.getItem("jwtToken");
        const storedUser = localStorage.getItem("user");
        const directRole = localStorage.getItem("role"); // Đọc trực tiếp key "role" nếu có

        // 1. Kiểm tra đăng nhập
        if (!token || !storedUser) {
            toast.error("Please log in first!");
            navigate("/login");
            return;
        }

        try {
            const userObj = JSON.parse(storedUser);
            
            // Lấy role từ userObj hoặc từ localStorage direct key
            const userRole = userObj?.role || directRole;

            // 2. Kiểm tra xem có phải ADMIN không
            if (userRole !== "ADMIN") {
                setIsAuthorized(false); // Không phải ADMIN
                return;
            }

            // 3. Nếu là ADMIN -> Cấp quyền truy cập
            setIsAuthorized(true);
            if (userObj.username || userObj.fullName) {
                setAdminName(userObj.username || userObj.fullName);
            }
        } catch (e) {
            console.error("Failed to parse stored user", e);
            setIsAuthorized(false);
        }
    }, [navigate]);

    // Đang trong quá trình kiểm tra token/role (tránh flicker/chớp màn hình)
    if (isAuthorized === null) {
        return null;
    }

    // 🔥 NẾU KHÔNG PHẢI ADMIN: Hiển thị ngay NotPermittedPage
    if (isAuthorized === false) {
        return <NotPermittedPage />;
    }

    // Hàm style động cho NavLink
    const getNavLinkStyle = ({ isActive }: { isActive: boolean }) => ({
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 18px",
        borderRadius: "8px",
        backgroundColor: isActive ? "rgba(56, 189, 248, 0.1)" : "transparent",
        color: isActive ? "#38bdf8" : "#94a3b8",
        border: isActive ? "1.5px solid #38bdf8" : "1.5px solid #334155",
        fontSize: "14px",
        fontWeight: "600",
        textDecoration: "none",
        transition: "all 0.2s ease",
        boxShadow: isActive ? "0 0 12px rgba(56, 189, 248, 0.2)" : "none"
    });

    return (
        <div style={{ backgroundColor: "#0f172a", minHeight: "100vh", color: "#f8fafc" }}>
            <Toaster position="top-right" />
            <AdminHeader adminName={adminName} />

            <div style={{ display: "flex", minHeight: "calc(100vh - 65px)" }}>
                {/* SIDEBAR NAVIGATION */}
                <aside style={{
                    width: "280px",
                    backgroundColor: "#1e293b",
                    padding: "24px 18px",
                    position: "sticky",
                    top: "65px",
                    height: "calc(100vh - 65px)",
                    boxSizing: "border-box",
                    borderRight: "1px solid #334155",
                    flexShrink: 0
                }}>
                    <div style={{ paddingBottom: "16px", marginBottom: "20px", borderBottom: "1px solid #334155" }}>
                        <h2 style={{ fontSize: "11px", fontWeight: "700", margin: 0, color: "#64748b", textTransform: "uppercase", letterSpacing: "1.5px" }}>
                            Navigation Menu
                        </h2>
                    </div>

                    <nav style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <NavLink to="/admin/products" style={getNavLinkStyle}>
                            <span>📦</span> Products Management
                        </NavLink>
                        
                        <NavLink to="/admin/users" style={getNavLinkStyle}>
                            <span>👥</span> User Accounts
                        </NavLink>
                        
                        <NavLink to="/admin/orders" style={getNavLinkStyle}>
                            <span>🛒</span> Orders Management
                        </NavLink>

                        <NavLink to="/admin/requirements" style={getNavLinkStyle}>
                            <span>📩</span> User Requirements
                        </NavLink>
                    </nav>
                </aside>

                {/* MAIN CONTENT AREA */}
                <main style={{ flex: 1, padding: "32px", overflowX: "hidden", backgroundColor: "#0f172a" }}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}