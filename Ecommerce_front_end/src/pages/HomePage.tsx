import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage } from "@react-three/drei";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import axios from "axios";

import "../css/App.css";

import Discount_Box from "../3d_animations/discount_box.tsx";
import Asus_Model from "../3d_animations/asus_animation.tsx";

import Header from "../components/Header.tsx";
import ProductList from "../components/Productlist.tsx";

// Import Custom Hook
import { useAiRec } from "../context/AiRecContext.tsx";

interface Product {
    parent_asin: string;
    title: string;
    price: number | string;
    main_category: string;
    category: string;
    image_url: string;
    store: string;
}

function MainPage() {
    const container = useRef<HTMLDivElement | null>(null);

    // Tiêu thụ Global State từ Context (Đã bỏ triggerAiSearch vì tự động chạy ngầm)
    const { aiRecs, isAiLoading, aiError } = useAiRec();

    // Local State (Chỉ dành riêng cho UI của trang này)
    const [products, setProducts] = useState<Product[]>([]);
    const [isProductsLoading, setIsProductsLoading] = useState(false);

    // GSAP Animation
    useGSAP(
        () => {
            const timeline = gsap.timeline();
            timeline
                .from(".charD", { x: 100, opacity: 0, duration: 0.1 })
                .from(".charE1", { y: -100, opacity: 0, duration: 0.1 })
                .from(".charF", { x: 100, opacity: 0, duration: 0.1 })
                .from(".charI", { y: -100, opacity: 0, duration: 0.1 })
                .from(".charN", { x: -100, opacity: 0, duration: 0.1 })
                .from(".charE2", { y: 100, opacity: 0, duration: 0.1 })
                .from(".charY1", { x: -100, opacity: 0, duration: 0.1 })
                .from(".charO", { y: 100, opacity: 0, duration: 0.1 })
                .from(".charU", { x: -100, opacity: 0, duration: 0.1 })
                .from(".charR", { y: 100, opacity: 0, duration: 0.1 })
                .from(".charS", { x: -100, opacity: 0, duration: 0.1 })
                .from(".charT", { y: 100, opacity: 0, duration: 0.1 })
                .from(".charY2", { x: -100, opacity: 0, duration: 0.1 })
                .from(".charL", { y: 100, opacity: 0, duration: 0.1 })
                .from(".charE3", { x: 100, opacity: 0, duration: 0.1 });
        },
        { scope: container }
    );

    // Fetch Products (Dữ liệu chung, cục bộ cho trang chủ)
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setIsProductsLoading(true);
                const response = await axios.get(
                    "http://localhost:8080/api/products",
                    {
                        params: { page: 1, size: 20, category: "" },
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem("jwtToken")}`,
                        },
                    }
                );

                if (response.data?.content) {
                    setProducts(response.data.content);
                } else if (Array.isArray(response.data)) {
                    setProducts(response.data);
                } else {
                    setProducts([]);
                }
            } catch (error) {
                console.error("Lỗi tải sản phẩm:", error);
                setProducts([]);
            } finally {
                setIsProductsLoading(false);
            }
        };

        fetchProducts();
    }, []);

    return (
        <div>
            <Header />

            {/* Hero Bar */}
            <section className="herobar" style={{ display: "flex", alignItems: "center", padding: "20px" }}>
                <div ref={container} className="herotext" style={{ flex: 1 }}>
                    <div className="style-text">
                        <div className="char" style={{ fontSize: "2.5rem", fontWeight: "bold" }}>
                            <span className="charD">D</span>
                            <span className="charE1">E</span>
                            <span className="charF">F</span>
                            <span className="charI">I</span>
                            <span className="charN">N</span>
                            <span className="charE2">E</span>
                        </div>
                        <div className="char" style={{ fontSize: "2.5rem", fontWeight: "bold" }}>
                            <span className="charY1">Y</span>
                            <span className="charO">O</span>
                            <span className="charU">U</span>
                            <span className="charR">R</span>
                            &nbsp;
                            <span className="charS">S</span>
                            <span className="charT">T</span>
                            <span className="charY2">Y</span>
                            <span className="charL">L</span>
                            <span className="charE3">E</span>
                        </div>
                    </div>
                </div>

                <div className="canvas-container" style={{ width: "50%", height: "50vh", paddingTop: "20px" }}>
                    <Canvas camera={{ position: [5, 1, 5], fov: 20 }}>
                        <Suspense fallback={null}>
                            <Stage environment="city" intensity={0.6}>
                                <Asus_Model />
                            </Stage>
                        </Suspense>
                        <OrbitControls makeDefault />
                    </Canvas>
                </div>
            </section>

            {/* Discount Box & Category */}
            <section className="discountbox" style={{ height: "200px", background: "#ffffff" }}>
                <Discount_Box />
            </section>

            <section className="category-section" style={{ padding: "0 20px" }}>
                <h2>Shop by Category</h2>
            </section>

            {/* Main Products & AI Section */}
            <section className="demo-products-container" style={{ display: "flex", flexWrap: "wrap", gap: "25px", padding: "20px", marginBottom: "30px", background: "#ffffff" }}>
                
                {/* General Products */}
                <div style={{ flex: 2, minWidth: "350px", padding: "20px", background: "#ffffff", borderRadius: "8px", border: "1px solid #e0e0e0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                    <h3 style={{ marginBottom: "15px", color: "#333" }}>Product List (Browse Shop)</h3>
                    <ProductList products={products} loading={isProductsLoading} />
                </div>

                {/* AI Recommendation Panel */}
                <div style={{ flex: 1, minWidth: "300px", padding: "20px", background: "#ffffff", borderRadius: "8px", border: "2px dashed #198754", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                    <h3 style={{ marginBottom: "15px", color: "#198754" }}>AI Recommendation</h3>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {aiError ? (
                            <div style={{ padding: "15px", textAlign: "center", background: "#fef2f2", borderRadius: "6px", border: "1px dashed #ef4444", color: "#dc2626", fontSize: "13px" }}>
                                ⚠️ {aiError}
                            </div>
                        ) : !isAiLoading && aiRecs.length === 0 ? (
                            <div style={{ padding: "15px", textAlign: "center", background: "#f4fbf7", borderRadius: "6px", border: "1px dashed #a3e635" }}>
                                <span style={{ fontSize: "13px", color: "#16a34a", fontWeight: 500 }}>
                                    🤖 AI Recommendations Empty
                                </span>
                            </div>
                        ) : (
                            <ProductList products={aiRecs} loading={isAiLoading} />
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}

export default MainPage;