import React from "react";
import { Link, useNavigate } from "react-router-dom";

const NotPermittedPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: "calc(100vh - 70px)", // Trừ đi chiều cao Header
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f8f9fa",
            padding: "20px"
        }}>
            <div style={{
                maxWidth: "500px",
                width: "100%",
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                padding: "40px 30px",
                textAlign: "center",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.05)",
                border: "1px solid #eaeaea"
            }}>
                {/* SVG Icon Khoá / Cảnh báo */}
                <div style={{
                    width: "80px",
                    height: "80px",
                    margin: "0 auto 24px",
                    borderRadius: "50%",
                    backgroundColor: "#fff5f5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}>
                    <svg
                        width="44"
                        height="44"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#dc3545"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        <line x1="12" y1="15" x2="12" y2="17"></line>
                    </svg>
                </div>

                {/* Mã lỗi & Tiêu đề */}
                <span style={{
                    fontSize: "14px",
                    fontWeight: "bold",
                    color: "#dc3545",
                    letterSpacing: "1.5px",
                    textTransform: "uppercase"
                }}>
                    Error 403
                </span>
                
                <h1 style={{
                    fontSize: "26px",
                    fontWeight: "700",
                    color: "#212529",
                    margin: "8px 0 12px"
                }}>
                    Truy Cập Bị Từ Chối
                </h1>

                {/* Mô tả chi tiết */}
                <p style={{
                    fontSize: "15px",
                    color: "#6c757d",
                    lineHeight: "1.6",
                    margin: "0 0 30px"
                }}>
                    Rất tiếc, tài khoản của bạn không có đủ quyền hạn để truy cập vào trang này. Nếu bạn nghĩ đây là lỗi, vui lòng liên hệ với Quản trị viên.
                </p>

                {/* Các nút hành động */}
                <div style={{
                    display: "flex",
                    gap: "12px",
                    justifyContent: "center",
                    flexWrap: "wrap"
                }}>
                    {/* Nút quay lại trang trước */}
                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            padding: "10px 20px",
                            borderRadius: "8px",
                            border: "1px solid #ced4da",
                            backgroundColor: "#ffffff",
                            color: "#495057",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "all 0.2s"
                        }}
                    >
                        ← Quay lại
                    </button>

                    {/* Nút về Trang chủ */}
                    <Link
                        to="/"
                        style={{
                            padding: "10px 20px",
                            borderRadius: "8px",
                            backgroundColor: "#0d6efd",
                            color: "#ffffff",
                            fontSize: "14px",
                            fontWeight: "600",
                            textDecoration: "none",
                            display: "inline-block",
                            transition: "all 0.2s"
                        }}
                    >
                        Về trang chủ
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default NotPermittedPage;