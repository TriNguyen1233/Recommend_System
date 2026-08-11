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
import { ProductCard } from "../components/ProductCard.tsx";

import {
    aiRecommendationSeeds,
} from "../data/dataSeeds.ts";

interface Product {
    parent_asin: string;
    title: string;
    price: number | string;
    main_category: string;
    category: string;
    image_url: string;
    store: string;
}

interface SearchInputData {
    user_id: string;
    search: string;
    category?: string;
}

function MainPage() {
    const container = useRef<HTMLDivElement | null>(null);
    const userIdRef = useRef<HTMLInputElement | null>(null);
    const searchTextRef = useRef<HTMLTextAreaElement | null>(null);

    const [aiRecs, setAiRecs] = useState<Product[]>(
        aiRecommendationSeeds
    );

    const [products, setProducts] = useState<Product[]>([]);

    const [modal, setModal] = useState(false);

    const [loading, setLoading] = useState(false);


    const search = async () => {
        const inputData: SearchInputData = {
            user_id: userIdRef.current?.value || "",
            search: searchTextRef.current?.value || "",
        };

        try {
            setLoading(true);

            console.log("User ID:", inputData.user_id);
            console.log("Search:", inputData.search);

            const response = await axios.post(
                "http://localhost:8000/api/v1/recommendations",
                inputData
            );

            if (response.data?.recommendations) {
                setAiRecs(response.data.recommendations);
            }

            // Đóng modal sau khi search thành công
            setModal(false);

        } catch (error) {
            console.error(
                "Lỗi khi gọi API AI Recommendations:",
                error
            );
        } finally {
            setLoading(false);
        }
    };


    useGSAP(
        () => {
            const timeline = gsap.timeline();

            timeline
                .from(".charD", {
                    x: 100,
                    opacity: 0,
                    duration: 0.1,
                })
                .from(".charE1", {
                    y: -100,
                    opacity: 0,
                    duration: 0.1,
                })
                .from(".charF", {
                    x: 100,
                    opacity: 0,
                    duration: 0.1,
                })
                .from(".charI", {
                    y: -100,
                    opacity: 0,
                    duration: 0.1,
                })
                .from(".charN", {
                    x: -100,
                    opacity: 0,
                    duration: 0.1,
                })
                .from(".charE2", {
                    y: 100,
                    opacity: 0,
                    duration: 0.1,
                })
                .from(".charY1", {
                    x: -100,
                    opacity: 0,
                    duration: 0.1,
                })
                .from(".charO", {
                    y: 100,
                    opacity: 0,
                    duration: 0.1,
                })
                .from(".charU", {
                    x: -100,
                    opacity: 0,
                    duration: 0.1,
                })
                .from(".charR", {
                    y: 100,
                    opacity: 0,
                    duration: 0.1,
                })
                .from(".charS", {
                    x: -100,
                    opacity: 0,
                    duration: 0.1,
                })
                .from(".charT", {
                    y: 100,
                    opacity: 0,
                    duration: 0.1,
                })
                .from(".charY2", {
                    x: -100,
                    opacity: 0,
                    duration: 0.1,
                })
                .from(".charL", {
                    y: 100,
                    opacity: 0,
                    duration: 0.1,
                })
                .from(".charE3", {
                    x: 100,
                    opacity: 0,
                    duration: 0.1,
                });
        },
        {
            scope: container,
        }
    );


    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);

                const response = await axios.get(
                    "http://localhost:8080/api/products",
                    {
                        params: {
                            page: 1,
                            size: 20,
                            category: "",
                        },
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem(
                                "jwtToken"
                            )}`,
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
                console.error(
                    "Lỗi tải sản phẩm:",
                    error
                );

                setProducts([]);

            } finally {
                setLoading(false);
            }
        };
        
        fetchProducts();
    }, []);

    return (
        <div>
            <Header />
            <section
                className="herobar"
                style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "20px",
                }}
            >
                {/* Hero Text */}

                <div
                    ref={container}
                    className="herotext"
                    style={{
                        flex: 1,
                    }}
                >
                    <div className="style-text">

                        <div
                            className="char"
                            style={{
                                fontSize: "2.5rem",
                                fontWeight: "bold",
                            }}
                        >
                            <span className="charD">D</span>
                            <span className="charE1">E</span>
                            <span className="charF">F</span>
                            <span className="charI">I</span>
                            <span className="charN">N</span>
                            <span className="charE2">E</span>
                        </div>

                        <div
                            className="char"
                            style={{
                                fontSize: "2.5rem",
                                fontWeight: "bold",
                            }}
                        >
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


                <div
                    className="canvas-container"
                    style={{
                        width: "50%",
                        height: "50vh",
                        paddingTop: "20px",
                    }}
                >
                    <Canvas
                        camera={{
                            position: [5, 1, 5],
                            fov: 20,
                        }}
                    >
                        <Suspense fallback={null}>
                            <Stage
                                environment="city"
                                intensity={0.6}
                            >
                                <Asus_Model />
                            </Stage>
                        </Suspense>

                        <OrbitControls makeDefault />
                    </Canvas>
                </div>
            </section>


            {modal && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 9999,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >

                    <div
                        className="modal-backdrop"
                        onClick={() => setModal(false)}
                        style={{
                            position: "absolute",
                            inset: 0,
                            backgroundColor:
                                "rgba(0, 0, 0, 0.5)",
                        }}
                    />

                    <div
                        className="modal-box"
                        style={{
                            position: "relative",
                            zIndex: 10,
                            width: "90%",
                            maxWidth: "480px",
                            padding: "25px",
                            background: "#ffffff",
                            borderRadius: "8px",
                            boxShadow:
                                "0 4px 12px rgba(0, 0, 0, 0.15)",
                        }}
                    >

                        <button
                            type="button"
                            onClick={() => setModal(false)}
                            style={{
                                position: "absolute",
                                top: "10px",
                                right: "15px",
                                border: "none",
                                background: "transparent",
                                fontSize: "24px",
                                cursor: "pointer",
                                color: "#aaa",
                            }}
                        >
                            &times;
                        </button>

                        <div
                            style={{
                                marginBottom: "15px",
                                paddingBottom: "10px",
                                borderBottom:
                                    "1px solid #e9ecef",
                            }}
                        >
                            <h3
                                style={{
                                    margin: 0,
                                    color: "#0d6efd",
                                }}
                            >
                                🤖 AI Recommendation
                            </h3>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "15px",
                            }}
                        >

                            {/* User ID */}

                            <div>
                                <label
                                    style={{
                                        display: "block",
                                        marginBottom: "6px",
                                        fontWeight: "bold",
                                        fontSize: "14px",
                                        color: "#333",
                                    }}
                                >
                                    User ID
                                </label>

                                <input
                                    type="text"
                                    ref={userIdRef}
                                    placeholder="Nhập mã định danh, ví dụ: user_01"
                                    style={{
                                        width: "100%",
                                        padding: "10px",
                                        boxSizing: "border-box",
                                        border:
                                            "1px solid #ced4da",
                                        borderRadius: "4px",
                                    }}
                                />
                            </div>

                            <div>
                                <label
                                    style={{
                                        display: "block",
                                        marginBottom: "6px",
                                        fontWeight: "bold",
                                        fontSize: "14px",
                                        color: "#333",
                                    }}
                                >
                                    Search Description
                                </label>

                                <textarea
                                    ref={searchTextRef}
                                    placeholder="Which product are you looking for?"
                                    style={{
                                        width: "100%",
                                        height: "100px",
                                        padding: "10px",
                                        boxSizing: "border-box",
                                        border:
                                            "1px solid #ced4da",
                                        borderRadius: "4px",
                                        resize: "none",
                                    }}
                                />
                            </div>

                        </div>

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: "10px",
                                marginTop: "20px",
                                paddingTop: "15px",
                                borderTop:
                                    "1px solid #e9ecef",
                            }}
                        >

                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => setModal(false)}
                                className="btn-secondary"
                            >
                                Close
                            </button>

                            <button
                                type="button"
                                disabled={loading}
                                onClick={search}
                                className="btn-primary"
                            >
                                {loading
                                    ? "Searching..."
                                    : "Search Now"}
                            </button>

                        </div>

                    </div>
                </div>
            )}

            <section
                className="discountbox"
                style={{
                    height: "200px",
                    background: "#ffffff",
                }}
            >
                <Discount_Box />
            </section>

            <section
                className="category-section"
                style={{
                    padding: "0 20px",
                }}
            >
                <h2>Shop by Category</h2>

                <button
                    className="loginbutton"
                    onClick={() => setModal(true)}
                    style={{
                        padding: "8px 16px",
                        color: "#fff",
                        backgroundColor: "#0d6efd",
                        border: "none",
                        borderRadius: "4px",
                    }}
                >
                    Search
                </button>
            </section>


            <section
                className="demo-products-container"
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "25px",
                    padding: "20px",
                    marginBottom: "30px",
                    background: "#ffffff",
                }}
            >

                <div
                    style={{
                        flex: 2,
                        minWidth: "350px",
                        padding: "20px",
                        background: "#ffffff",
                        borderRadius: "8px",
                        border:
                            "1px solid #e0e0e0",
                        boxShadow:
                            "0 2px 4px rgba(0,0,0,0.02)",
                    }}
                >
                    <h3
                        style={{
                            marginBottom: "15px",
                            color: "#333",
                        }}
                    >
                        Product List (Browse Shop)
                    </h3>
                    <ProductList
                        products={products}
                        loading={loading}
                    />
                </div>

                <div
                    style={{
                        flex: 1,
                        minWidth: "300px",
                        padding: "20px",
                        background: "#ffffff",
                        borderRadius: "8px",
                        border:
                            "2px dashed #198754",
                        boxShadow:
                            "0 2px 4px rgba(0,0,0,0.02)",
                    }}
                >
                    <h3
                        style={{
                            marginBottom: "15px",
                            color: "#198754",
                        }}
                    >
                        AI Recommendation
                    </h3>

                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                        }}
                    >

                        {loading ? (

                            <div className="neon-spinner-container">
                                <div className="neon-spinner" />
                                <p>
                                    AI Recommendation Loading...
                                </p>
                            </div>

                        ) : aiRecs.length > 0 ? (

                            aiRecs.map((aiRec) => (
                                <div
                                    key={aiRec.parent_asin}
                                    style={{
                                        padding: "15px",
                                        textAlign: "center",
                                        background:
                                            "#f4fbf7",
                                        borderRadius: "6px",
                                        border:
                                            "1px dashed #a3e635",
                                    }}
                                >
                                    <ProductCard
                                        product={aiRec}
                                    />
                                </div>
                            ))

                        ) : (

                            <div
                                style={{
                                    padding: "15px",
                                    textAlign: "center",
                                    background:
                                        "#f4fbf7",
                                    borderRadius: "6px",
                                    border:
                                        "1px dashed #a3e635",
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: "13px",
                                        color: "#16a34a",
                                        fontWeight: 500,
                                    }}
                                >
                                    🤖 AI Recommendations Empty
                                </span>
                            </div>

                        )}

                    </div>
                </div>

            </section>

        </div>
    );
}

export default MainPage;