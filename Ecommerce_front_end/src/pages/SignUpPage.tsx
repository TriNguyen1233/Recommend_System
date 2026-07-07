import "../css/SignUpPage.css"; // Đã đổi: Sử dụng file CSS riêng biệt

function SignUpPage() {
    return (
        <div className="signup-page">
            {/* Đã đổi class cha thành signup-form */}
            <div className="signup-form">
                
                {/* Brand Logo TechStore */}
                <div className="signup-brand">
                    TechStore
                </div>
                
                <h2 className="signup-title">Sign Up</h2>
                <p className="signup-subtitle">
                    Create your account to start shopping
                </p>

                <form className="signup-form__container">
                    {/* Trường: Họ và tên */}
                    <div className="signup-form__group">
                        <input type="text" id="fullname" placeholder="Full Name" required />
                    </div>

                    {/* Trường: Email */}
                    <div className="signup-form__group">
                        <input type="email" id="email" placeholder="Email Address" required />
                    </div>

                    {/* Trường: Mật khẩu */}
                    <div className="signup-form__group">
                        <input type="password" id="password" placeholder="Password" required />
                    </div>

                    {/* Trường: Xác nhận mật khẩu */}
                    <div className="signup-form__group">
                        <input type="password" id="confirm-password" placeholder="Confirm Password" required />
                    </div>

                    {/* Nút đăng ký */}
                    <button type="submit" className="signup-form__btn">Sign Up</button>
                </form>

                {/* Đường kẻ ngang ngăn cách Hoặc đăng ký bằng MXH */}
                <div className="signup-divider">
                    <span>— Or Sign Up With —</span>
                </div>

                {/* Các nút bấm đăng ký nhanh bằng Mạng xã hội */}
                <div className="signup-social">
                    <div className="signup-social__item">
                        {/* Facebook Icon */}
                        <svg className="signup-social__icon signup-social__icon--fb" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                            <path d="M576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 440 146.7 540.8 258.2 568.5L258.2 398.2L205.4 398.2L205.4 320L258.2 320L258.2 286.3C258.2 199.2 297.6 158.8 383.2 158.8C399.4 158.8 427.4 162 438.9 165.2L438.9 236C432.9 235.4 422.4 235 409.3 235C367.3 235 351.1 250.9 351.1 292.2L351.1 320L434.7 320L420.3 398.2L351 398.2L351 574.1C477.8 558.8 576 450.9 576 320z" />
                        </svg>
                    </div>
                    <div className="signup-social__item">
                        {/* Gmail/Google Icon */}
                        <svg className="signup-social__icon signup-social__icon--gg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                            <path d="M112 128C85.5 128 64 149.5 64 176C64 191.1 71.1 205.3 83.2 214.4L291.2 370.4C308.3 383.2 331.7 383.2 348.8 370.4L556.8 214.4C568.9 205.3 576 191.1 576 176C576 149.5 554.5 128 528 128L112 128zM64 260L64 448C64 483.3 92.7 512 128 512L512 512C547.3 512 576 483.3 576 448L576 260L377.6 408.8C343.5 434.4 296.5 434.4 262.4 408.8L64 260z" />
                        </svg>
                    </div>
                    <div className="signup-social__item">
                        {/* X (Twitter) Icon */}
                        <svg className="signup-social__icon signup-social__icon--x" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                            <path d="M453.2 112L523.8 112L369.6 288.2L551 528L409 528L297.7 382.6L170.5 528L99.8 528L264.7 339.5L90.8 112L236.4 112L336.9 244.9L453.2 112zM428.4 485.8L467.5 485.8L215.1 152L173.1 152L428.4 485.8z" />
                        </svg>
                    </div>
                </div>

                {/* Điều hướng */}
                <div className="signup-footer">
                    Already have an account? <span className="signup-footer__link">Login here</span>
                </div>
            </div>
        </div>
    );
}

export default SignUpPage;