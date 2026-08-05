import { useEffect, useRef } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import toast, { Toaster } from "react-hot-toast";

import Header from "../components/Header.tsx";
import "../css/App.css";

// Helper function to map VNPay error codes to user-friendly messages
const getErrorMessage = (code: string | null): string => {
    switch (code) {
        case "24":
            return "Transaction was cancelled by the user.";
        case "11":
            return "Payment timeout expired. Please try again.";
        case "51":
            return "Insufficient balance in your bank account.";
        case "65":
            return "Your account has exceeded the daily transaction limit.";
        case "75":
            return "Payment bank is currently undergoing maintenance.";
        case "79":
            return "Entered password/OTP incorrectly too many times.";
        default:
            return "An unexpected error occurred during the transaction. Please try again.";
    }
};

function PaymentFailedPage() {
    const pageRef = useRef<HTMLDivElement | null>(null);
    const badgeRef = useRef<HTMLDivElement | null>(null);
    const cardRef = useRef<HTMLDivElement | null>(null);

    const [searchParams] = useSearchParams();

    // Extract parameters from URL
    const orderId = searchParams.get("orderId") || searchParams.get("vnp_TxnRef") || "ORDER_N/A";
    const errorCode = searchParams.get("code") || searchParams.get("vnp_ResponseCode") || "UNKNOWN";
    const amountParam = searchParams.get("amount");

    const errorMessage = getErrorMessage(errorCode);
    const formattedDate = new Date().toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    });

    // 1. GSAP ANIMATIONS
    useGSAP(() => {
        // Fade in header elements
        gsap.from(".header-animate", {
            y: -20,
            opacity: 0,
            duration: 0.5,
            stagger: 0.1,
            ease: "power2.out",
        });

        // Shake & Pop animation for Error Icon Badge
        if (badgeRef.current) {
            const tl = gsap.timeline();
            tl.fromTo(
                badgeRef.current,
                { scale: 0.2, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)", delay: 0.1 }
            ).to(badgeRef.current, {
                x: 8,
                duration: 0.08,
                repeat: 5,
                yoyo: true,
                ease: "power1.inOut",
            });
        }

        // Slide up order details card
        if (cardRef.current) {
            gsap.fromTo(
                cardRef.current,
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.5, ease: "power2.out", delay: 0.3 }
            );
        }
    }, { scope: pageRef });

    // 2. TRIGGER ERROR TOAST ON MOUNT
    useEffect(() => {
        toast.error("Payment failed or was cancelled.", { duration: 4000 });
    }, []);

    return (
        <div ref={pageRef} style={{ backgroundColor: "#ffffff", minHeight: "100vh", paddingBottom: "60px" }}>
            <Toaster position="top-right" reverseOrder={false} />

            <Header />

            {/* BREADCRUMB */}
            <div style={{ padding: "15px 50px", background: "#f8f9fa", borderBottom: "1px solid #e9ecef", fontSize: "14px", color: "#6c757d" }}>
                <NavLink to="/" style={{ color: "#0d6efd", textDecoration: "none" }}>Home</NavLink> /
                <NavLink to="/cart" style={{ color: "#0d6efd", textDecoration: "none", marginLeft: "6px" }}> Shopping Cart</NavLink> /
                <strong style={{ color: "#dc3545", marginLeft: "8px" }}>Payment Failed</strong>
            </div>

            <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px" }}>

                {/* HEADING SECTION */}
                <div className="header-animate" style={{ textAlign: "center", marginBottom: "35px" }}>
                    
                    {/* ERROR BADGE ICON */}
                    <div
                        ref={badgeRef}
                        style={{
                            width: "80px",
                            height: "80px",
                            borderRadius: "50%",
                            backgroundColor: "#ffebee",
                            color: "#c62828",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 20px auto",
                            boxShadow: "0 4px 15px rgba(198, 40, 40, 0.18)",
                        }}
                    >
                        <svg width="42" height="42" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z" />
                        </svg>
                    </div>

                    <h1 style={{ fontSize: "30px", fontWeight: "800", color: "#111", marginBottom: "8px" }}>
                        Payment Unsuccessful
                    </h1>
                    <p style={{ color: "#6c757d", fontSize: "16px", margin: 0 }}>
                        Your payment could not be processed. No funds were charged from your account.
                    </p>
                </div>

                {/* FAILURE DETAILS CARD */}
                <div
                    ref={cardRef}
                    style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        border: "1px solid #e0e0e0",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                        padding: "35px",
                    }}
                >
                    <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#111", marginBottom: "20px", borderBottom: "2px solid #f1f3f5", paddingBottom: "12px" }}>
                        Failure Details
                    </h2>

                    <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "15px" }}>
                        
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#6c757d" }}>Order Identifier</span>
                            <span style={{ fontWeight: "700", color: "#111", fontFamily: "monospace", fontSize: "16px" }}>
                                {orderId}
                            </span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#6c757d" }}>Date & Time</span>
                            <span style={{ fontWeight: "600", color: "#333" }}>{formattedDate}</span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#6c757d" }}>Error Code</span>
                            <span style={{ fontWeight: "700", color: "#dc3545", fontFamily: "monospace" }}>
                                {errorCode}
                            </span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <span style={{ color: "#6c757d", minWidth: "120px" }}>Reason</span>
                            <span style={{ fontWeight: "600", color: "#c62828", textAlign: "right" }}>
                                {errorMessage}
                            </span>
                        </div>

                        {amountParam && (
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ color: "#6c757d" }}>Attempted Amount</span>
                                <span style={{ fontWeight: "700", color: "#111" }}>
                                    {Number(amountParam).toLocaleString()} VND
                                </span>
                            </div>
                        )}

                    </div>

                    {/* NOTICE BANNER */}
                    <div style={{
                        backgroundColor: "#fff8e1",
                        borderLeft: "4px solid #ffc107",
                        padding: "12px 16px",
                        borderRadius: "4px",
                        marginTop: "25px",
                        fontSize: "13px",
                        color: "#856404"
                    }}>
                        <strong>Need Help?</strong> If money was deducted from your account, it will be automatically refunded within 24–48 working hours.
                    </div>

                    <hr style={{ border: "none", borderTop: "1px solid #e9ecef", margin: "25px 0" }} />

                    {/* ACTION BUTTONS */}
                    <div style={{ display: "flex", gap: "15px", justifyContent: "center", flexWrap: "wrap" }}>
                        <NavLink
                            to="/cart"
                            style={{
                                flex: 1,
                                minWidth: "200px",
                                textAlign: "center",
                                padding: "12px 20px",
                                borderRadius: "6px",
                                backgroundColor: "#212529",
                                color: "#ffffff",
                                fontWeight: "bold",
                                textDecoration: "none",
                                fontSize: "15px",
                                transition: "all 0.2s ease",
                            }}
                        >
                            Return to Cart & Retry
                        </NavLink>

                        <NavLink
                            to="/"
                            style={{
                                flex: 1,
                                minWidth: "200px",
                                textAlign: "center",
                                padding: "12px 20px",
                                borderRadius: "6px",
                                border: "1px solid #ced4da",
                                backgroundColor: "#ffffff",
                                color: "#212529",
                                fontWeight: "bold",
                                textDecoration: "none",
                                fontSize: "15px",
                            }}
                        >
                            Back to Home
                        </NavLink>
                    </div>

                </div>

            </div>
        </div>
    );
}

export default PaymentFailedPage;