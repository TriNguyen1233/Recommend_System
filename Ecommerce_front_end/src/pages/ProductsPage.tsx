import { useEffect, useState, useRef } from "react";
import { NavLink } from "react-router-dom";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import axios from "axios";

import Header from "../components/Header.tsx";
import "../css/App.css";
import CategoryTabs from "../components/CategoryTabs.tsx";
import ProductList from "../components/Productlist.tsx";

interface Product {
    parent_asin?: string;
    title?: string;
    price?: number | string;
    main_category?: string;
    category?: string;
    image?: string;
    image_url?: string;
    store?: string;
}

function ProductsPage() {
    const pageRef = useRef<HTMLDivElement | null>(null);

    // Trạng thái AI Recommendation
    const [aiRecs, setAiRecs] = useState<Product[]>([]);
    const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
    const [aiError, setAiError] = useState<string | null>(null);

    // States danh sách sản phẩm chung
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [currentPage, setCurrentPage] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(10);
    const [category, setCategory] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [searchKeyword, setSearchKeyword] = useState<string>("");

    const pageSize = 20;

    // Helper hiển thị tên danh mục trên UI
    const displayCategoryName = !category || category.toLowerCase() === "all" 
        ? "All Products" 
        : category.charAt(0).toUpperCase() + category.slice(1);

    // Hàm gọi API sản phẩm tiêu chuẩn
    const fetchProducts = async () => {
        setLoading(true);
        try {
            const response = await axios.get("http://localhost:8080/api/products", {
                params: {
                    page: currentPage,
                    size: pageSize,
                    category: category?.toLowerCase() === "all" ? "" : category
                },
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("jwtToken")}`
                }
            });

            if (response.data.content) {
                setProducts(response.data.content);
                setTotalPages(response.data.totalPages || 1);
            } else if (Array.isArray(response.data)) {
                setProducts(response.data);
            }
        } catch (error) {
            console.error("Lỗi tải sản phẩm:", error);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    // Hàm gọi API Semantic Search
    const semanticSearch = async () => {
        setLoading(true);
        try {
            const response = await axios.get("http://localhost:8080/api/products/semantic", {
                params: {
                    query: searchQuery,
                    page: currentPage,
                    size: pageSize,
                    category: category?.toLowerCase() === "all" ? "" : category
                },
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("jwtToken")}`
                }
            });
            if (response.data.content) {
                setProducts(response.data.content);
                setTotalPages(response.data.totalPages || 1);
            } else if (Array.isArray(response.data)) {
                setProducts(response.data);
            }
        } catch (error) {
            console.error("Lỗi tìm kiếm:", error);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    // Tự động Fetch AI Recommendation theo Context (Search Keyword & Category)
    useEffect(() => {
        const fetchContextualAiRecommendations = async () => {
            setIsAiLoading(true);
            setAiError(null);
            
            try {
                const currentUserId = localStorage.getItem("userId") || "guest_user";
                
                const prompt = searchKeyword.trim() 
                    ? searchKeyword 
                    : "General recommendations based on user preference";
                
                const currentCategory = category?.toLowerCase() === "all" ? "" : category;

                // Xây dựng payload động, loại bỏ key category nếu rỗng để tránh lỗi metadata của Vector DB
                const autoPayload: { user_id: string; search: string; category?: string } = {
                    user_id: currentUserId,
                    search: prompt
                };

                if (currentCategory) {
                    autoPayload.category = currentCategory;
                }

                const response = await axios.post(
                    "http://localhost:8000/api/v1/recommendations",
                    autoPayload
                );

                let resultData: Product[] = [];
                if (response.data?.recommendations && Array.isArray(response.data.recommendations)) {
                    resultData = response.data.recommendations;
                } else if (response.data?.data && Array.isArray(response.data.data)) {
                    resultData = response.data.data;
                } else if (Array.isArray(response.data)) {
                    resultData = response.data;
                }

                setAiRecs(resultData);

            } catch (error) {
                console.error("AI Fetch Error:", error);
                setAiError("Không thể kết nối với dịch vụ AI.");
            } finally {
                setIsAiLoading(false);
            }
        };

        fetchContextualAiRecommendations();
    }, [searchKeyword, category]);

    // Luồng Data Fetching chính: Chuyển đổi linh hoạt giữa Lọc thường và Tìm kiếm ngữ nghĩa
    useEffect(() => {
        if (!searchKeyword) {
            fetchProducts();
        } else {
            semanticSearch();
        }
    }, [currentPage, category, searchKeyword]);

    const selectCategory = (cat: string) => {
        setSearchKeyword("");
        setSearchQuery("");
        setCategory(cat);
        setCurrentPage(0);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setSearchKeyword(searchQuery.trim());
        setCurrentPage(0);
    };

    useGSAP(() => {
        gsap.from(".header-animate", {
            y: -20,
            opacity: 0,
            duration: 0.5,
            stagger: 0.1,
            ease: "power2.out"
        });
    }, { scope: pageRef });

    const handlePageChange = (newPage: number) => {
        if (newPage >= 0 && newPage < totalPages) {
            setCurrentPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div ref={pageRef} style={{ backgroundColor: '#ffffff', minHeight: '100vh', paddingBottom: '50px' }}>
            <Header />

            <div style={{ padding: '15px 50px', background: '#f8f9fa', borderBottom: '1px solid #e9ecef', fontSize: '14px', color: '#6c757d' }}>
                <NavLink to="/" style={{ color: '#0d6efd', textDecoration: 'none' }}>Home</NavLink> /
                <strong style={{ color: '#333', marginLeft: '8px' }}>{displayCategoryName}</strong>
            </div>

            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' }}>

                <div className="header-animate" style={{ textAlign: 'center', marginBottom: '25px' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#111', marginBottom: '10px' }}>
                        Explore Our Collection
                    </h1>
                    <p style={{ color: '#6c757d', fontSize: '16px', marginBottom: '25px' }}>
                        Find the best gears and accessories that define your style.
                    </p>

                    <form
                        onSubmit={handleSearchSubmit}
                        style={{
                            position: 'relative',
                            maxWidth: '600px',
                            margin: '0 auto 20px auto',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <input
                            type="text"
                            placeholder="Search products by title or semantics..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '14px 130px 14px 25px',
                                borderRadius: '50px',
                                border: '2px solid #e0e0e0',
                                outline: 'none',
                                fontSize: '15px',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
                                backgroundColor: '#ffffff'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#0d6efd'}
                            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                        />
                        <button
                            type="submit"
                            style={{
                                position: 'absolute',
                                right: '6px',
                                padding: '10px 24px',
                                borderRadius: '40px',
                                border: 'none',
                                backgroundColor: '#0d6efd',
                                color: '#ffffff',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0b5ed7'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0d6efd'}
                        >
                            <span>Search</span>
                        </button>
                    </form>
                </div>

                <CategoryTabs activeCategory={category || "all"} onSelectCategory={selectCategory} />

                <div style={{ display: "flex", flexWrap: "wrap", gap: "25px", marginTop: "20px" }}>
                    
                    <div style={{
                        flex: 3,
                        minWidth: "350px",
                        background: '#ffffff',
                        padding: '30px',
                        borderRadius: '12px',
                        border: '1px solid #e0e0e0',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '2px solid #f1f3f5', paddingBottom: '15px' }}>
                            <h2 style={{ fontSize: '20px', color: '#333', margin: 0 }}>
                                {searchKeyword ? `Search results for "${searchKeyword}"` : displayCategoryName}
                            </h2>
                            <span style={{ fontSize: '14px', color: '#6c757d', fontWeight: 'bold' }}>
                                {loading ? "Loading..." : `Showing ${products.length} results`}
                            </span>
                        </div>

                        <ProductList products={products} loading={loading} />

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

                    <div style={{
                        flex: 1,
                        minWidth: "300px",
                        padding: "20px",
                        background: "#ffffff",
                        borderRadius: "12px",
                        border: "2px dashed #198754",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                        alignSelf: "flex-start" 
                    }}>
                        <h3 style={{ marginBottom: "20px", color: "#198754", fontSize: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
                            ✨ Related AI Suggestions
                        </h3>

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

                </div>
            </div>
        </div>
    );
}

export default ProductsPage;