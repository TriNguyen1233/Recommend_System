import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import "../css/SignUpPage.css"; // Giữ nguyên CSS cũ của bạn

function SignUpPage() {
    const navigate = useNavigate();

    // 1. Quản lý State cho Form
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    const [loading, setLoading] = useState(false);

    // 2. Xử lý sự kiện thay đổi Input
    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [id]: value
        }));
    };

    // 3. Xử lý submit Form Đăng Ký
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate 1: Kiểm tra mật khẩu khớp nhau
        if (formData.password !== formData.confirmPassword) {
            Swal.fire({
                icon: "warning",
                title: "Mật khẩu không khớp!",
                text: "Vui lòng kiểm tra lại Mật khẩu và Xác nhận mật khẩu.",
                confirmButtonColor: "#0d6efd"
            });
            return;
        }

        // Validate 2: Kiểm tra độ dài mật khẩu tối thiểu
        if (formData.password.length < 6) {
            Swal.fire({
                icon: "warning",
                title: "Mật khẩu quá ngắn",
                text: "Mật khẩu phải có ít nhất 6 ký tự.",
                confirmButtonColor: "#0d6efd"
            });
            return;
        }

        setLoading(true);

        try {
            // Chuẩn bị dữ liệu gửi lên API (Khớp với SignupRequest DTO backend)
            const signupData = {
                fullName: formData.fullName,
                email: formData.email,
                password: formData.password
            };

            // Gọi API đăng ký
            const response = await axios.post(
                "http://localhost:8080/api/users/signup",
                signupData
            );

            // Xử lý phản hồi từ Backend (ResponseEntity<Boolean>)
            if (response.data === true) {
                Swal.fire({
                    icon: "success",
                    title: "Đăng ký thành công!",
                    text: "Tài khoản của bạn đã được tạo thành công. Vui lòng đăng nhập!",
                    timer: 2000,
                    showConfirmButton: false
                });

                // Chuyển hướng tới trang Đăng nhập sau 2 giây
                setTimeout(() => {
                    navigate("/login");
                }, 2000);
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Đăng ký thất bại",
                    text: "Email này có thể đã được đăng ký hoặc có lỗi xảy ra. Vui lòng thử lại!"
                });
            }
        } catch (error) {
            console.error("Sign up error:", error);
            Swal.fire({
                icon: "error",
                title: "Lỗi kết nối",
                text: error.response?.data?.message || "Không thể kết nối đến máy chủ. Vui lòng thử lại sau!"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="signup-page">
            <div className="signup-form">
                
                {/* Brand Logo TechStore */}
                <div className="signup-brand">
                    TechStore
                </div>
                
                <h2 className="signup-title">Sign Up</h2>
                <p className="signup-subtitle">
                    Create your account to start shopping
                </p>

                <form className="signup-form__container" onSubmit={handleSubmit}>
                    {/* Trường: Họ và tên */}
                    <div className="signup-form__group">
                        <input 
                            type="text" 
                            id="fullName" 
                            placeholder="Full Name" 
                            value={formData.fullName}
                            onChange={handleChange}
                            required 
                        />
                    </div>

                    {/* Trường: Email */}
                    <div className="signup-form__group">
                        <input 
                            type="email" 
                            id="email" 
                            placeholder="Email Address" 
                            value={formData.email}
                            onChange={handleChange}
                            required 
                        />
                    </div>

                    {/* Trường: Mật khẩu */}
                    <div className="signup-form__group">
                        <input 
                            type="password" 
                            id="password" 
                            placeholder="Password" 
                            value={formData.password}
                            onChange={handleChange}
                            required 
                        />
                    </div>

                    {/* Trường: Xác nhận mật khẩu */}
                    <div className="signup-form__group">
                        <input 
                            type="password" 
                            id="confirmPassword" 
                            placeholder="Confirm Password" 
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required 
                        />
                    </div>

                    {/* Nút đăng ký */}
                    <button 
                        type="submit" 
                        className="signup-form__btn"
                        disabled={loading}
                        style={{ cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? "Signing up..." : "Sign Up"}
                    </button>
                </form>

                {/* Đường kẻ ngang */}
                <div className="signup-divider">
                    <span>— Or Sign Up With —</span>
                </div>

                {/* Các nút bấm đăng ký nhanh bằng Mạng xã hội */}
                <div className="signup-social">
                    <div className="signup-social__item">
                        <svg className="signup-social__icon signup-social__icon--fb" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                            <path d="M576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 440 146.7 540.8 258.2 568.5L258.2 398.2L205.4 398.2L205.4 320L258.2 320L258.2 286.3C258.2 199.2 297.6 158.8 383.2 158.8C399.4 158.8 427.4 162 438.9 165.2L438.9 236C432.9 235.4 422.4 235 409.3 235C367.3 235 351.1 250.9 351.1 292.2L351.1 320L434.7 320L420.3 398.2L351 398.2L351 574.1C477.8 558.8 576 450.9 576 320z" />
                        </svg>
                    </div>
                    <div className="signup-social__item">
                        <svg className="signup-social__icon signup-social__icon--gg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                            <path d="M112 128C85.5 128 64 149.5 64 176C64 191.1 71.1 205.3 83.2 214.4L291.2 370.4C308.3 383.2 331.7 383.2 348.8 370.4L556.8 214.4C568.9 205.3 576 191.1 576 176C576 149.5 554.5 128 528 128L112 128zM64 260L64 448C64 483.3 92.7 512 128 512L512 512C547.3 512 576 483.3 576 448L576 260L377.6 408.8C343.5 434.4 296.5 434.4 262.4 408.8L64 260z" />
                        </svg>
                    </div>
                    <div className="signup-social__item">
                        <svg className="signup-social__icon signup-social__icon--x" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                            <path d="M453.2 112L523.8 112L369.6 288.2L551 528L409 528L297.7 382.6L170.5 528L99.8 528L264.7 339.5L90.8 112L236.4 112L336.9 244.9L453.2 112zM428.4 485.8L467.5 485.8L215.1 152L173.1 152L428.4 485.8z" />
                        </svg>
                    </div>
                </div>

                {/* Điều hướng đến Login */}
                <div className="signup-footer">
                    Already have an account?{" "}
                    <Link to="/login" className="signup-footer__link">
                        Login here
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default SignUpPage;