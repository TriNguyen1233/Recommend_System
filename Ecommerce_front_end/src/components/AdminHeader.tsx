import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";

interface AdminHeaderProps {
    adminName?: string;
}

function AdminHeader({ adminName = "Admin" }: AdminHeaderProps) {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("jwtToken");
        localStorage.removeItem("user");
        toast.success("Logged out successfully!");
        navigate("/login");
    };

    return (
        <header style={{
            height: "65px",
            backgroundColor: "#0f172a",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 30px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            position: "sticky",
            top: 0,
            zIndex: 100
        }}>
            {/* LOGO / BRANDING */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Link to="/admin" style={{ textDecoration: "none", color: "#ffffff", display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                        width: "36px",
                        height: "36px",
                        backgroundColor: "#0284c7",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "bold",
                        fontSize: "20px"
                    }}>
                        ⚡
                    </div>
                    <span style={{ fontSize: "20px", fontWeight: "800", letterSpacing: "0.5px" }}>
                        TechStore <span style={{ color: "#38bdf8", fontSize: "12px", backgroundColor: "rgba(56, 189, 248, 0.15)", padding: "3px 8px", borderRadius: "12px", marginLeft: "6px" }}>ADMIN</span>
                    </span>
                </Link>
            </div>

            {/* ACTION BUTTONS & USER PROFILE */}
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                {/* Xem trang cửa hàng */}
                <Link to="/" style={{
                    color: "#94a3b8",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    backgroundColor: "#1e293b",
                    transition: "all 0.2s"
                }}>
                    🌐 View Storefront
                </Link>

                {/* Thông tin Admin */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingLeft: "15px", borderLeft: "1px solid #334155" }}>
                    <div style={{
                        width: "35px",
                        height: "35px",
                        borderRadius: "50%",
                        backgroundColor: "#38bdf8",
                        color: "#0f172a",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px"
                    }}>
                        {adminName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "14px", fontWeight: "bold", color: "#f8fafc" }}>{adminName}</span>
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>Administrator</span>
                    </div>
                </div>

                {/* Nút Đăng xuất */}
                <button
                    onClick={handleLogout}
                    style={{
                        backgroundColor: "#ef4444",
                        color: "#ffffff",
                        border: "none",
                        padding: "8px 14px",
                        borderRadius: "6px",
                        fontWeight: "600",
                        fontSize: "13px",
                        cursor: "pointer",
                        transition: "background-color 0.2s"
                    }}
                >
                    Logout
                </button>
            </div>
        </header>
    );
}

export default AdminHeader;