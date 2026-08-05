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

    const normalizeProducts = (items: any[]): Product[] => {
        return items.map((item) => ({
            ...item,
            image: item.image ?? item.image_url ?? ""
        }));
    };

    // States
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [currentPage, setCurrentPage] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(10);
    const [category, setCategory] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [searchKeyword, setSearchKeyword] = useState<string>("");

    const pageSize = 20;

    // 🟢 Hàm gọi API sản phẩm theo Category & Pagination
    const fetchProducts = async () => {
        setLoading(true);
        try {
            const response = await axios.get("http://localhost:8080/api/products", {
                params: {
                    page: currentPage,
                    size: pageSize,
                    category: category === "all" ? "" : category
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

    // 🟢 Hàm gọi API Semantic Search
    const semanticSearch = async () => {
        setLoading(true);
        try {
            const response = await axios.get("http://localhost:8080/api/products/semantic", {
                params: {
                    query: searchQuery,
                    page: currentPage,
                    size: pageSize,
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

    // Tự động load dữ liệu mỗi khi Đổi Trang hoặc Đổi Danh Mục (khi không trong chế độ Tìm kiếm)
    useEffect(() => {
        if (!searchKeyword) {
            fetchProducts();
        } else {
            semanticSearch();
        }
    }, [currentPage, category]);

    const selectCategory = (cat: string) => {
        setSearchKeyword(""); // Clear từ khóa tìm kiếm khi chọn danh mục
        setSearchQuery("");
        setCategory(cat);
        setCurrentPage(0);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setSearchKeyword(searchQuery.trim());
        setCurrentPage(0);
        semanticSearch();
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
                <strong style={{ color: '#333', marginLeft: '8px' }}>All Products</strong>
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
                            placeholder="Search products by title..."
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

                <CategoryTabs activeCategory={category ?? "all"} onSelectCategory={selectCategory} />

                <div style={{
                    background: '#ffffff',
                    padding: '30px',
                    borderRadius: '12px',
                    border: '1px solid #e0e0e0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '2px solid #f1f3f5', paddingBottom: '15px' }}>
                        <h2 style={{ fontSize: '20px', color: '#333', margin: 0 }}>
                            {searchKeyword ? `Search results for "${searchKeyword}"` : "All Products"}
                        </h2>
                        <span style={{ fontSize: '14px', color: '#6c757d', fontWeight: 'bold' }}>
                            {loading ? "Loading..." : `Showing ${products.length} results`}
                        </span>
                    </div>

                    {/* 🟢 Tích hợp ProductList cùng trạng thái loading */}
                    <ProductList products={products} loading={loading} />
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