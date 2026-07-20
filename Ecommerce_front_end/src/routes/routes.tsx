import { createBrowserRouter } from "react-router-dom";
import App from "../App"; // Import file App của bạn vào đây
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import SignUpPage from "../pages/SignUpPage";
import NotFoundPage from "../pages/NotFoundPage";
import ProductDetailPage from "../pages/ProductDetailPage";
import ProductsPage from "../pages/ProductsPage";

const Routes = createBrowserRouter([
    {
        path: "/",
        element: <App />,
        children: [
            {
                index: true,
                path: "homepage",
                element: <HomePage />
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
                path: "*",
                element: <NotFoundPage />
            },
            {
                path: "product/:id",
                element: <ProductDetailPage />
            },
            {
                path:"products",
                element:<ProductsPage/>
            }

        ]
    }
]);

export default Routes;