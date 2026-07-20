import { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import "../css/ProductList.css";
import axios from "axios";

interface Product {
    parent_asin?: string;
    title?: string;
    price?: number | string;
    main_category?: string;
    category?: string;
    image_url?: string;
    store?: string;
}

const ProductList = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(1);
    const pageSize = 20; // Number of items per page

    useEffect(() => {
        let isMounted = true;

        const loadProducts = async () => {
            try {
                setLoading(true);
                const response = await axios.get("http://localhost:8080/products", {
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

                // Handle response data from Spring Boot Pageable
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

    // Handle page navigation
    const handlePageChange = (newPage: number) => {
        if (newPage >= 0 && newPage < totalPages) {
            setCurrentPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div style={{ padding: '20px 0' }}>
            {/* PRODUCT GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
                {!loading && products.length > 0 ? (
                    products.map(product => (
                        <ProductCard
                            key={product.parent_asin || Math.random().toString()}
                            product={product}
                        />
                    ))
                ) : (
                    <div className="neon-spinner-container" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
                        <div className="neon-spinner"></div>
                        <p>{loading ? "Loading data..." : "No products found."}</p>
                    </div>
                )}
            </div>

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '10px',
                    marginTop: '30px'
                }}>
                    {/* Previous Button */}
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 0 || loading}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: '1px solid #ccc',
                            backgroundColor: currentPage === 0 ? '#f0f0f0' : '#ffffff',
                            cursor: currentPage === 0 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        &laquo; Previous
                    </button>

                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                        Page {currentPage + 1} of {totalPages}
                    </span>

                    {/* Next Button */}
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages - 1 || loading}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: '1px solid #ccc',
                            backgroundColor: currentPage >= totalPages - 1 ? '#f0f0f0' : '#ffffff',
                            cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Next &raquo;
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProductList;