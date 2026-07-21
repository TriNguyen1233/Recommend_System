import { useEffect, useState, useRef } from "react";
import { NavLink } from "react-router-dom";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import axios from "axios";

import Header from "../components/Header.tsx";
import ProductCard from "../components/ProductCard.tsx";
import "../css/App.css";

interface Product {
    parent_asin?: string;
    title?: string;
    price?: number | string;
    main_category?: string;
    category?: string;
    image_url?: string;
    store?: string;
}

function ProductsPage() {
    const pageRef = useRef<HTMLDivElement | null>(null);
    const gridRef = useRef<HTMLDivElement | null>(null);

    // States cho dữ liệu API & Loading
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // States cho Phân trang (Pagination)
    const [currentPage, setCurrentPage] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(1);
    const pageSize = 20;

    // 1. Fetch dữ liệu từ API Spring Boot theo trang
    useEffect(() => {
        let isMounted = true;

        const loadProducts = async () => {
            try {
                setLoading(true);
                const response = await axios.get("http://localhost:8080/api/products", {
                    params: {
                        page: currentPage,
                        size: pageSize
                    },
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("jwtToken")}`
                    }
                });

                if (!isMounted) return;

                console.log("Response data:", response.data);

                // Xử lý dữ liệu dạng Pageable của Spring Boot
                if (response.data.content) {
                    setProducts(response.data.content);
                    setTotalPages(response.data.totalPages || 1);
                } else if (Array.isArray(response.data)) {
                    setProducts(response.data);
                }
            } catch (error) {
                if (isMounted) {
                    console.error("Error fetching product list:", error);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadProducts();

        return () => {
            isMounted = false;
        };
    }, [currentPage, pageSize]);

    // 2. Hiệu ứng GSAP khi load giao diện lần đầu
    useGSAP(() => {
        gsap.from(".header-animate", {
            y: -20,
            opacity: 0,
            duration: 0.5,
            stagger: 0.1,
            ease: "power2.out"
        });
    }, { scope: pageRef });

    // 3. Hiệu ứng GSAP xuất hiện danh sách sản phẩm mỗi khi đổi trang hoặc load xong
    useEffect(() => {
        if (gridRef.current && products.length > 0 && !loading) {
            gsap.fromTo(
                gridRef.current.children,
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: "power2.out" }
            );
        }
    }, [products, loading]);

    // Thao tác chuyển trang
    const handlePageChange = (newPage: number) => {
        if (newPage >= 0 && newPage < totalPages) {
            setCurrentPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div ref={pageRef} style={{ backgroundColor: '#ffffff', minHeight: '100vh', paddingBottom: '50px' }}>
            <Header />

            {/* BREADCRUMB */}
            <div style={{ padding: '15px 50px', background: '#f8f9fa', borderBottom: '1px solid #e9ecef', fontSize: '14px', color: '#6c757d' }}>
                <NavLink to="/" style={{ color: '#0d6efd', textDecoration: 'none' }}>Home</NavLink> /
                <strong style={{ color: '#333', marginLeft: '8px' }}>All Products</strong>
            </div>

            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' }}>

                {/* TIÊU ĐỀ TRANG */}
                <div className="header-animate" style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#111', marginBottom: '10px' }}>
                        Explore Our Collection
                    </h1>
                    <p style={{ color: '#6c757d', fontSize: '16px' }}>
                        Find the best gears and accessories that define your style.
                    </p>
                </div>

                {/* KHU VỰC LƯỚI SẢN PHẨM */}
                <div style={{
                    background: '#ffffff',
                    padding: '30px',
                    borderRadius: '12px',
                    border: '1px solid #e0e0e0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '2px solid #f1f3f5', paddingBottom: '15px' }}>
                        <h2 style={{ fontSize: '20px', color: '#333', margin: 0 }}>
                            All Products
                        </h2>
                        <span style={{ fontSize: '14px', color: '#6c757d', fontWeight: 'bold' }}>
                            {loading ? "Loading..." : `Showing ${products.length} results`}
                        </span>
                    </div>

                    {/* HIỂN THỊ DANH SÁCH / SPINNER */}
                    {!loading && products.length > 0 ? (
                        <div ref={gridRef} style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                            gap: '25px'
                        }}>
                            {products.map(product => (
                                <div key={product.parent_asin || Math.random().toString()}>
                                    <NavLink to={`/product/${product.parent_asin}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                        <ProductCard product={product} />
                                    </NavLink>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="neon-spinner-container" style={{ textAlign: 'center', padding: '60px 20px', color: '#6c757d' }}>
                            <div className="neon-spinner"></div>
                            <p style={{ marginTop: '15px' }}>
                                {loading ? "Loading data..." : "No products found."}
                            </p>
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '12px',
                        marginTop: '30px'
                    }}>
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 0 || loading}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '6px',
                                border: '1px solid #ccc',
                                backgroundColor: currentPage === 0 ? '#f0f0f0' : '#ffffff',
                                color: currentPage === 0 ? '#aaa' : '#333',
                                cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                                fontWeight: 'bold',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            &laquo; Previous
                        </button>

                        <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#333' }}>
                            Page {currentPage + 1} of {totalPages}
                        </span>

                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages - 1 || loading}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '6px',
                                border: '1px solid #ccc',
                                backgroundColor: currentPage >= totalPages - 1 ? '#f0f0f0' : '#ffffff',
                                color: currentPage >= totalPages - 1 ? '#aaa' : '#333',
                                cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                                fontWeight: 'bold',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            Next &raquo;
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}

export default ProductsPage;