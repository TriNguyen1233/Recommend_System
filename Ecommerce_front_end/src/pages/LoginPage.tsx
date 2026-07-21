import axios from "axios";
import "../css/LoginPage.css";
import { useRef, useState } from "react";
// 1. Only import Firebase functions
import { signInWithPopup } from 'firebase/auth';
// Ensure your firebase.ts file exports googleProvider, facebookProvider, and auth
import { auth, facebookProvider, googleProvider } from "../firebase/firebase";
import toast from 'react-hot-toast';
import { useNavigate } from "react-router-dom"

function LoginPage() {
    const url = "http://localhost:8080/api/users";
    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    // Handle normal email/password login
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // 🟢 Toast ID for normal login
        const toastId = toast.loading('Logging in...');

        const loginUrl = url + "/login";
        const requestBody = {
            email: emailRef.current?.value,
            password: passwordRef.current?.value
        };

        axios.post(loginUrl, requestBody).then((response) => {
            console.log(response.data);
            const data = response.data;

            // Synchronize local storage for standard login
            localStorage.setItem("user", JSON.stringify(data));
            localStorage.setItem("item", data['id']);
            localStorage.setItem("jwtToken", data['token']);

            // 🟢 Update toast with English success message
            toast.success('Login successful! 🎉', { id: toastId });
            navigate("/homepage"); // Added redirection to homepage on form login success
        }).catch((error) => {
            if (error.response) {
                console.error("Server error:", error.response.data.message || error.response.statusText);
                // 🟢 Update toast with English error message
                toast.error("Login failed: " + (error.response.data.message || "Invalid credentials"), { id: toastId });
            } else {
                console.error("Connection error:", error.message);
                // 🟢 Update toast with English error message
                toast.error("Cannot connect to server!", { id: toastId });
            }
        });
    };

    const handleFirebaseLoginOnBackend = async (idToken: string, provider: string, toastId: string) => {
        try {
            const response = await axios.post('http://localhost:8080/api/auth/firebase-login', {
                token: idToken
            });

            console.log("Backend response:", response.data);

            const token = response.data.mySystemToken || response.data.token || response.data.jwtToken || response.data.accessToken;
            const user = response.data.user || response.data;

            if (token) {
                localStorage.setItem("user", JSON.stringify(user));
                localStorage.setItem("item", user.id || user.uid || "");
                localStorage.setItem("jwtToken", token);

                // 🟢 English success message
                toast.success(`${provider} login successful! 🎉`, { id: toastId });

                setTimeout(() => {
                    navigate("/homepage");
                }, 500);
            } else {
                // 🟢 English error message
                toast.error("Authentication failed: No token received from server!", { id: toastId });
            }
        } catch (error: any) {
            console.error(`Error sending ${provider} token to backend:`, error);
            // 🟢 English error message
            toast.error("System authentication failed!", { id: toastId });
        }
    };

    // Facebook Login via Firebase
    const handleFacebookLogin = async () => {
        // 🟢 Toast ID for Facebook login
        const toastId = toast.loading('Processing Facebook login...');
        try {
            const result = await signInWithPopup(auth, facebookProvider);
            const idToken = await result.user.getIdToken();
            console.log("Firebase FB Token:", idToken);

            await handleFirebaseLoginOnBackend(idToken, "Facebook", toastId);
        } catch (error: any) {
            console.error("Firebase FB error:", error);
            if (error.code === 'auth/popup-closed-by-user') {
                toast.error('Facebook login popup was closed by user.', { id: toastId });
            } else {
                toast.error("Facebook login failed: " + error.message, { id: toastId });
            }
        }
    };

    // Google Login via Firebase
    const handleGoogleLogin = async () => {
        // 🟢 Toast ID for Google login
        const toastId = toast.loading('Processing Google login...');
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const idToken = await result.user.getIdToken();
            console.log("Firebase Google Token:", idToken);

            await handleFirebaseLoginOnBackend(idToken, "Google", toastId);
        } catch (error: any) {
            console.error("Firebase Google error:", error);
            if (error.code === 'auth/popup-closed-by-user') {
                toast.error("Google login popup was closed by user.", { id: toastId });
            } else {
                toast.error("Google login failed: " + error.message, { id: toastId });
            }
        }
    };

    return (
        <div className="login-page">
            <div className="login-form">
                <div className="login-brand">TechStore</div>
                <h2 className="login-title">Login</h2>
                <p className="login-subtitle">Welcome back! Please login to your account.</p>

                <form className="login-form__container" onSubmit={handleSubmit}>
                    <div className="login-form__group">
                        <input
                            type="email"
                            id="email"
                            ref={emailRef}
                            placeholder="Email Address"
                            className="login-form__input"
                            required
                        />
                    </div>

                    <div className="login-form__group">
                        <input
                            ref={passwordRef}
                            type={showPassword ? "text" : "password"}
                            id="password"
                            placeholder="Password"
                            className="login-form__input"
                            required
                        />
                        <div className="showPass" onClick={() => setShowPassword(!showPassword)}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" >
                                <path d="M320 96C239.2 96 174.5 132.8 127.4 176.6C80.6 220.1 49.3 272 34.4 307.7C31.1 315.6 31.1 324.4 34.4 332.3C49.3 368 80.6 420 127.4 463.4C174.5 507.1 239.2 544 320 544C400.8 544 465.5 507.2 512.6 463.4C559.4 419.9 590.7 368 605.6 332.3C608.9 324.4 608.9 315.6 605.6 307.7C590.7 272 559.4 220 512.6 176.6C465.5 132.9 400.8 96 320 96zM176 320C176 240.5 240.5 176 320 176C399.5 176 464 240.5 464 320C464 399.5 399.5 464 320 464C240.5 464 176 399.5 176 320zM320 256C320 291.3 291.3 320 256 320C244.5 320 233.7 317 224.3 311.6C223.3 322.5 224.2 333.7 227.2 344.8C240.9 396 293.6 426.4 344.8 412.7C396 399 426.4 346.3 412.7 295.1C400.5 249.4 357.2 220.3 311.6 224.3C316.9 233.6 320 244.4 320 256z" />
                            </svg>
                        </div>
                    </div>

                    <button type="submit" className="login-form__btn">Login</button>
                </form>

                <div className="login-divider">
                    <span>— Or Login With —</span>
                </div>

                <div className="login-social">
                    <div className="login-social__item">
                        <div
                            className="login-social__item login-social__item--fb"
                            onClick={handleFacebookLogin}
                            style={{ cursor: 'pointer' }}
                            role="button"
                            tabIndex={0}
                        >
                            <svg className="login-social__icon login-social__icon--fb" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                                <path d="M576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 440 146.7 540.8 258.2 568.5L258.2 398.2L205.4 398.2L205.4 320L258.2 320L258.2 286.3C258.2 199.2 297.6 158.8 383.2 158.8C399.4 158.8 427.4 162 438.9 165.2L438.9 236C432.9 235.4 422.4 235 409.3 235C367.3 235 351.1 250.9 351.1 292.2L351.1 320L434.7 320L420.3 398.2L351 398.2L351 574.1C477.8 558.8 576 450.9 576 320z" />
                            </svg>
                        </div>
                    </div>

                    <div className="login-social__item">
                        <div
                            className="login-social__item login-social__item--gg"
                            onClick={handleGoogleLogin}
                            style={{ cursor: 'pointer' }}
                            role="button"
                            tabIndex={0}
                        >
                            <svg className="login-social__icon login-social__icon--gg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                                <path d="M112 128C85.5 128 64 149.5 64 176C64 191.1 71.1 205.3 83.2 214.4L291.2 370.4C308.3 383.2 331.7 383.2 348.8 370.4L556.8 214.4C568.9 205.3 576 191.1 576 176C576 149.5 554.5 128 528 128L112 128zM64 260L64 448C64 483.3 92.7 512 128 512L512 512C547.3 512 576 483.3 576 448L576 260L377.6 408.8C343.5 434.4 296.5 434.4 262.4 408.8L64 260z" />
                            </svg>
                        </div>
                    </div>

                    <div className="login-social__item">
                        <svg className="login-social__icon login-social__icon--x" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                            <path d="M453.2 112L523.8 112L369.6 288.2L551 528L409 528L297.7 382.6L170.5 528L99.8 528L264.7 339.5L90.8 112L236.4 112L336.9 244.9L453.2 112zM428.4 485.8L467.5 485.8L215.1 152L173.1 152L428.4 485.8z" />
                        </svg>
                    </div>
                </div>

                <div className="login-footer">
                    Don't have an account? <a href={"./signup"} className="login-footer__link">Register here</a>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;