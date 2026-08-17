import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "../App";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import SignUpPage from "../pages/SignUpPage";
import NotFoundPage from "../pages/NotFoundPage";
import ProductDetailPage from "../pages/ProductDetailPage";
import ProductsPage from "../pages/ProductsPage";
import CartPage from "../pages/CartPage";
import ProfilePage from "../pages/ProfilePage";
import OrderConfirmationPage from "../pages/OrderConfirmationPage";
import PaymentFailedPage from "../pages/PaymentFailedPage";
import PaymentConfirmGuard from "../protection/PaymentConfirmGuard";

// Import Admin Layout & Sub-Pages
import AdminLayout from "../pages/admin/AdminLayout";
import ProductAdminPage from "../pages/admin/ProductAdminPage";
import UserAdminPage from "../pages/admin/UserAdminPage";
import OrderAdminPage from "../pages/admin/OrderAdminPage";
import RequestAdminPage from "../pages/admin/RequestAdminPage"; // 🔥 Import trang RequestAdminPage mới
import { AiRecProvider } from "../context/AiRecContext";

const Routes = createBrowserRouter([
    {
        path: "/",
        element: <App />,
        children: [
            {
                index: true,
                element: <AiRecProvider><HomePage /></AiRecProvider>
            },
            {
                path: "login",
                element: <LoginPage />
            },
            {
                path: "signup",
                element: <SignUpPage />
            },
            {
                path: "products/:id",
                element: <ProductDetailPage />
            },
            {
                path: "products",
                element: <ProductsPage />
            },
            {
                path: "cart",
                element: <CartPage />
            },
            {
                path: "profile",
                element: <ProfilePage />
            },

            // ==========================================
            // ADMIN NESTED ROUTES
            // ==========================================
            {
                path: "admin",
                element: <AdminLayout />,
                children: [
                    {
                        // Khi truy cập /admin sẽ tự động chuyển hướng sang /admin/products
                        index: true,
                        element: <Navigate to="products" replace />
                    },
                    {
                        path: "products",
                        element: <ProductAdminPage />
                    },
                    {
                        path: "users",
                        element: <UserAdminPage />
                    },
                    {
                        path: "orders",
                        element: <OrderAdminPage />
                    },
                    {
                        // 🔥 ROUTE MỚI: Quản lý Yêu cầu (/admin/requirements)
                        path: "requirements",
                        element: <RequestAdminPage />
                    }
                ]
            },

            {
                path: "paymentconfirm",
                element: (
                    <PaymentConfirmGuard>
                        <OrderConfirmationPage />
                    </PaymentConfirmGuard>
                )
            },
            {
                path: "paymentfailed",
                element: <PaymentFailedPage />
            },
            {
                path: "*",
                element: <NotFoundPage />
            }
        ]
    }
]);

export default Routes;