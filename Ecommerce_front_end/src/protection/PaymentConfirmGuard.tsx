import type { JSX } from "react";
import { useSearchParams, Navigate } from "react-router-dom";

interface Props {
    children: JSX.Element;
}

const PaymentConfirmGuard = ({ children }: Props) => {
    const [searchParams] = useSearchParams();

    // Lấy thông tin từ Query Params hoặc LocalStorage
    const userId = searchParams.get("userId") || localStorage.getItem("userId");

    // Kiểm tra xem có tham số phản hồi từ VNPay / Payment Gateway hay không
    const hasPaymentStatus =
        searchParams.has("vnp_ResponseCode") ||
        searchParams.has("paymentStatus") ||
        searchParams.has("status") ||
        searchParams.has("code");

    // ĐIỀU KIỆN BẢO VỆ: 
    // Nếu không có userId HOẶC không có tham số kết quả thanh toán
    // -> Điều hướng ngay lập tức về trang giỏ hàng
    if (!userId || !hasPaymentStatus) {
        return <Navigate to="/cart" replace />;
    }

    return children;
};

export default PaymentConfirmGuard;
