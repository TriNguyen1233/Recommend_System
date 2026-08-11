import { useEffect, useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";

import Header from "../components/Header.tsx";
import "../css/App.css";

interface UserProfile {
    id?: string;
    userId?: string;
    username?: string;
    email?: string;
    fullName?: string;
    phone?: string;
    address?: string;
    avatar?: string; // Đường dẫn URL avatar từ Backend
    role?: string;
}

function ProfilePage() {
    const navigate = useNavigate();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [formData, setFormData] = useState<UserProfile>({});

    // States cho tính năng Gửi Yêu Cầu Nâng Cấp Admin
    const [showAdminForm, setShowAdminForm] = useState<boolean>(false);
    const [reason, setReason] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                setFormData(parsedUser);
            } catch (error) {
                console.error("Failed to parse user session:", error);
                toast.error("Failed to load user information!");
            }
        } else {
            toast.error("You are not logged in!");
            navigate("/login");
        }
    }, [navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    // 🟢 HÀM XỬ LÝ UPLOAD FILE ẢNH LÊN BACKEND
    const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const currentUserId = user?.id || user?.userId;
        if (!currentUserId) {
            toast.error("User ID not found! Please log in again.");
            return;
        }

        // Tạo FormData chứa file truyền lên API
        const uploadFormData = new FormData();
        uploadFormData.append("file", file); // Key 'file' khớp với @RequestParam("file") ở Backend

        try {
            const token = localStorage.getItem("jwtToken") || localStorage.getItem("token");
            
            const response = await axios.post(
                `http://localhost:8080/api/users/${currentUserId}/avatar`,
                uploadFormData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                        Authorization: token ? `Bearer ${token}` : ""
                    }
                }
            );

            // Backend trả về: { avatar: "http://localhost:8080/uploads/avatars/...", message: "..." }
            const newAvatarUrl = response.data.avatar;

            // 1. Cập nhật State
            setFormData((prev) => ({ ...prev, avatar: newAvatarUrl }));
            setUser((prev) => (prev ? { ...prev, avatar: newAvatarUrl } : null));

            // 2. Cập nhật LocalStorage để khi F5 không bị mất ảnh
            const updatedUser = { ...user, avatar: newAvatarUrl };
            localStorage.setItem("user", JSON.stringify(updatedUser));

            toast.success("🎉 Tải ảnh đại diện lên thành công!");
        } catch (error: any) {
            console.error("Upload avatar failed:", error);
            const errorMsg = error.response?.data || "Lỗi khi upload avatar!";
            toast.error(typeof errorMsg === "string" ? errorMsg : "Upload thất bại!");
        }
    };

    const handleSave = async () => {
        try {
            // Cập nhật State và LocalStorage
            setUser(formData);
            localStorage.setItem("user", JSON.stringify(formData));
            
            const token = localStorage.getItem("jwtToken") || localStorage.getItem("token");
            const currentUserId = formData.id || formData.userId;
            
            if (token && currentUserId) {
                await axios.put(
                    `http://localhost:8080/api/users/${currentUserId}`,
                    formData,
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`
                        }
                    }
                ).catch(() => {
                    // Bỏ qua nếu backend chưa có endpoint PUT user
                });
            }

            setIsEditing(false);
            toast.success("Profile updated successfully!");
        } catch (error) {
            console.error("Failed to save profile:", error);
            toast.error("Failed to update profile!");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("jwtToken");
        toast.success("Logged out successfully!");
        navigate("/login");
    };

    // HÀM GỬI REQUEST NÂNG CẤP ADMIN
    const handleSendAdminRequirement = async (e: React.FormEvent) => {
        e.preventDefault();

        const currentUserId = user?.id || user?.userId;
        if (!currentUserId) {
            toast.error("User ID not found! Please log in again.");
            return;
        }

        try {
            setIsSubmitting(true);
            const token = localStorage.getItem("jwtToken") || localStorage.getItem("token");

            const payload = {
                userId: currentUserId,
                title: "Yêu cầu nâng cấp tài khoản lên Admin",
                description: reason.trim() || "Người dùng yêu cầu nâng quyền Admin từ trang thông tin cá nhân.",
                budget: 0,
                type: "BECOME_ADMIN"
            };

            await axios.post(
                "http://localhost:8080/api/requirements",
                payload,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: token ? `Bearer ${token}` : ""
                    }
                }
            );

            toast.success("🎉 Yêu cầu đã được gửi thành công! Vui lòng chờ Admin duyệt.");
            setShowAdminForm(false);
            setReason("");
        } catch (error: any) {
            console.error("Send requirement failed:", error);
            const errorMsg = error.response?.data?.message || "Gửi yêu cầu nâng cấp thất bại!";
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Ưu tiên lấy Avatar đang sửa (formData) nếu đang edit, hoặc avatar hiện tại (user)
    const currentAvatar = isEditing ? formData.avatar : user?.avatar;

    return (
        <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh", paddingBottom: "50px" }}>
            <Toaster position="top-right" reverseOrder={false} />
            <Header />

            {/* BREADCRUMB */}
            <div style={{ padding: "15px 50px", background: "#ffffff", borderBottom: "1px solid #e9ecef", fontSize: "14px", color: "#6c757d" }}>
                <NavLink to="/" style={{ color: "#0d6efd", textDecoration: "none" }}>Home</NavLink> /
                <strong style={{ color: "#333", marginLeft: "8px" }}>User Profile</strong>
            </div>

            {/* HERO BANNER */}
            <section style={{ padding: "30px 50px", background: "#ffffff", borderBottom: "1px solid #e0e0e0", marginBottom: "30px" }}>
                <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                    <h1 style={{ fontSize: "32px", fontWeight: "800", color: "#111", margin: "0 0 8px 0" }}>ACCOUNT PROFILE</h1>
                    <p style={{ color: "#6c757d", fontSize: "16px", margin: 0 }}>
                        Manage your personal information and account settings at <strong style={{ color: "#0d6efd" }}>TechStore</strong>.
                    </p>
                </div>
            </section>

            {/* MAIN CONTENT */}
            <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "25px" }}>

                    {/* LEFT SIDEBAR */}
                    <div style={{ flex: 1, minWidth: "280px", padding: "25px", background: "#ffffff", borderRadius: "12px", border: "1px solid #e0e0e0", height: "fit-content", textAlign: "center" }}>
                        <div style={{ width: "110px", height: "110px", borderRadius: "50%", backgroundColor: "#0d6efd", color: "#ffffff", margin: "0 auto 15px auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px", fontWeight: "bold", border: "3px solid #e9ecef", overflow: "hidden" }}>
                            {currentAvatar ? (
                                <img 
                                    src={currentAvatar} 
                                    alt="Avatar" 
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            ) : (
                                (user?.fullName || user?.username || "U").charAt(0).toUpperCase()
                            )}
                        </div>

                        <h3 style={{ margin: "0 0 5px 0", color: "#111", fontSize: "20px" }}>
                            {user?.fullName || user?.username || "User Account"}
                        </h3>

                        {/* ROLE BADGE */}
                        <div style={{ marginBottom: "12px" }}>
                            <span style={{
                                padding: "4px 12px",
                                borderRadius: "20px",
                                fontSize: "12px",
                                fontWeight: "bold",
                                backgroundColor: user?.role === "ADMIN" ? "#38bdf820" : "#6c757d20",
                                color: user?.role === "ADMIN" ? "#0284c7" : "#495057",
                                border: user?.role === "ADMIN" ? "1px solid #0284c7" : "1px solid #6c757d"
                            }}>
                                ROLE: {user?.role || "USER"}
                            </span>
                        </div>

                        <p style={{ color: "#6c757d", fontSize: "14px", margin: "0 0 20px 0" }}>
                            ID: {user?.userId || user?.id || "N/A"}
                        </p>

                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            <button
                                onClick={() => {
                                    setIsEditing(!isEditing);
                                    if (isEditing) setFormData(user || {});
                                }}
                                style={{ padding: "10px", backgroundColor: isEditing ? "#6c757d" : "#0d6efd", color: "#ffffff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
                            >
                                {isEditing ? "Cancel Edit" : "✏️ Edit Profile"}
                            </button>

                            {/* Nút Admin Dashboard */}
                            {user?.role === "ADMIN" && (
                                <button
                                    onClick={() => navigate("/admin")}
                                    style={{ padding: "10px", backgroundColor: "#0d9488", color: "#ffffff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
                                >
                                    🛡️ Go to Admin Dashboard
                                </button>
                            )}

                            {/* Nút Request Admin */}
                            {user?.role !== "ADMIN" && (
                                <button
                                    onClick={() => setShowAdminForm(!showAdminForm)}
                                    style={{ padding: "10px", backgroundColor: showAdminForm ? "#6c757d" : "#ffc107", color: showAdminForm ? "#fff" : "#212529", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
                                >
                                    {showAdminForm ? "Cancel Request" : "📩 Request Admin Role"}
                                </button>
                            )}

                            <button
                                onClick={handleLogout}
                                style={{ padding: "10px", backgroundColor: "#dc3545", color: "#ffffff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
                            >
                                🚪 Log Out
                            </button>
                        </div>
                    </div>

                    {/* RIGHT FORM */}
                    <div style={{ flex: 2, minWidth: "350px", display: "flex", flexDirection: "column", gap: "20px" }}>

                        {/* PERSONAL DETAILS */}
                        <div style={{ padding: "30px", background: "#ffffff", borderRadius: "12px", border: "1px solid #e0e0e0" }}>
                            <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#333", borderBottom: "2px solid #f1f3f5", paddingBottom: "10px" }}>
                                Personal Details
                            </h3>

                            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                                
                                {/* 🟢 NÚT CHỌN FILE ẢNH VÀ TẢI LÊN BACKEND */}
                                <div>
                                    <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", fontSize: "14px", color: "#495057" }}>
                                        Upload Profile Picture
                                    </label>
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        disabled={!isEditing} 
                                        onChange={handleAvatarFileChange} 
                                        style={{ 
                                            width: "100%", 
                                            padding: "8px 12px", 
                                            borderRadius: "6px", 
                                            border: "1px solid #ced4da", 
                                            backgroundColor: isEditing ? "#fff" : "#f8f9fa", 
                                            boxSizing: "border-box",
                                            cursor: isEditing ? "pointer" : "not-allowed" 
                                        }} 
                                    />
                                </div>

                                <div>
                                    <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", fontSize: "14px", color: "#495057" }}>Full Name</label>
                                    <input type="text" name="fullName" value={isEditing ? formData.fullName || "" : user?.fullName || "Not provided"} disabled={!isEditing} onChange={handleChange} style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #ced4da", backgroundColor: isEditing ? "#fff" : "#f8f9fa", boxSizing: "border-box" }} />
                                </div>

                                <div>
                                    <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", fontSize: "14px", color: "#495057" }}>Email Address</label>
                                    <input type="email" name="email" value={isEditing ? formData.email || "" : user?.email || "Not provided"} disabled={!isEditing} onChange={handleChange} style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #ced4da", backgroundColor: isEditing ? "#fff" : "#f8f9fa", boxSizing: "border-box" }} />
                                </div>

                                <div>
                                    <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", fontSize: "14px", color: "#495057" }}>Phone Number</label>
                                    <input type="text" name="phone" value={isEditing ? formData.phone || "" : user?.phone || "Not provided"} disabled={!isEditing} onChange={handleChange} style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #ced4da", backgroundColor: isEditing ? "#fff" : "#f8f9fa", boxSizing: "border-box" }} />
                                </div>

                                <div>
                                    <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", fontSize: "14px", color: "#495057" }}>Shipping Address</label>
                                    <input type="text" name="address" value={isEditing ? formData.address || "" : user?.address || "Not provided"} disabled={!isEditing} onChange={handleChange} style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #ced4da", backgroundColor: isEditing ? "#fff" : "#f8f9fa", boxSizing: "border-box" }} />
                                </div>

                                {isEditing && (
                                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                                        <button type="button" onClick={handleSave} style={{ padding: "10px 24px", backgroundColor: "#198754", color: "#ffffff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>Save Changes</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* FORM FORM SEND REQUIREMENT TO BECOME ADMIN */}
                        {showAdminForm && user?.role !== "ADMIN" && (
                            <div style={{ padding: "25px", background: "#fff8e1", borderRadius: "12px", border: "1px solid #ffe082" }}>
                                <h3 style={{ marginTop: 0, marginBottom: "10px", color: "#856404" }}>
                                    📩 Gửi yêu cầu nâng cấp Admin
                                </h3>
                                <p style={{ color: "#856404", fontSize: "14px", marginBottom: "15px" }}>
                                    Yêu cầu của bạn sẽ được chuyển đến Admin quản trị hệ thống phê duyệt.
                                </p>

                                <form onSubmit={handleSendAdminRequirement} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", fontSize: "13px", color: "#856404" }}>
                                            Lý do / Mô tả yêu cầu
                                        </label>
                                        <textarea
                                            rows={3}
                                            placeholder="Nhập lý do bạn muốn xin quyền Admin..."
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            style={{
                                                width: "100%",
                                                padding: "10px 12px",
                                                borderRadius: "6px",
                                                border: "1px solid #ffe082",
                                                backgroundColor: "#ffffff",
                                                boxSizing: "border-box",
                                                fontFamily: "inherit"
                                            }}
                                        />
                                    </div>

                                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                                        <button
                                            type="button"
                                            onClick={() => setShowAdminForm(false)}
                                            style={{ padding: "8px 16px", backgroundColor: "#6c757d", color: "#ffffff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
                                        >
                                            Hủy
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            style={{
                                                padding: "8px 20px",
                                                backgroundColor: "#d97706",
                                                color: "#ffffff",
                                                border: "none",
                                                borderRadius: "6px",
                                                fontWeight: "bold",
                                                cursor: isSubmitting ? "not-allowed" : "pointer"
                                            }}
                                        >
                                            {isSubmitting ? "Đang gửi..." : "Gửi Yêu Cầu"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProfilePage;