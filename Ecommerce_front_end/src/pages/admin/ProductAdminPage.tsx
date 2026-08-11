import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import type { Product } from "../../types/admin";

// --- MUI Components ---
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";

const PAGE_SIZE = 100; // 🟢 Cố định 100 sản phẩm / trang

export default function ProductAdminPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // States phân trang & lọc
    const [currentPage, setCurrentPage] = useState<number>(0); // 0-indexed (0 = Trang 1, 1 = Trang 2)
    const [totalElements, setTotalElements] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(1);

    const [category] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");

    // Modal & Form State
    const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [productForm, setProductForm] = useState<Partial<Product> & { stockQuantity?: number }>({
        title: "",
        price: "",
        category: "",
        image_url: "",
        store: "",
        stockQuantity: 0
    });

    // 🟢 Gọi API lấy sản phẩm và xử lý linh hoạt mọi kiểu dữ liệu Backend trả về
    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("jwtToken");
            const response = await axios.get("http://localhost:8080/api/products", {
                params: {
                    page: currentPage,
                    size: PAGE_SIZE,
                    category: category === "all" ? "" : category,
                    search: debouncedSearch.trim()
                },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            console.log("Response Data từ API Backend:", response.data);

            const resData = response.data;

            // TRƯỜNG HỢP 1: Backend dùng Spring Boot Page chuẩn (có content, totalElements, totalPages)
            if (resData && resData.content) {
                setProducts(resData.content);
                const total = Number(resData.totalElements) || 0;
                const pages = Number(resData.totalPages) || Math.ceil(total / PAGE_SIZE) || 1;

                setTotalElements(total);
                setTotalPages(pages);
            } 
            // TRƯỜNG HỢP 2: Backend trả về Object dạng { data: [...], total: ... }
            else if (resData && Array.isArray(resData.data)) {
                setProducts(resData.data);
                const total = Number(resData.total || resData.totalElements || resData.count) || resData.data.length;
                setTotalElements(total);
                setTotalPages(Math.ceil(total / PAGE_SIZE) || 1);
            }
            // TRƯỜNG HỢP 3: Backend trả về Mảng trực tiếp (Array)
            else if (Array.isArray(resData)) {
                // Kiểm tra xem Backend có gửi tổng số qua Response Header hay không
                const totalFromHeader = Number(
                    response.headers["x-total-count"] || 
                    response.headers["total-count"] || 
                    response.headers["x-total"]
                );

                if (!isNaN(totalFromHeader) && totalFromHeader > 0) {
                    // Phân trang Server-side có Header
                    setProducts(resData);
                    setTotalElements(totalFromHeader);
                    setTotalPages(Math.ceil(totalFromHeader / PAGE_SIZE) || 1);
                } else if (resData.length > PAGE_SIZE) {
                    // Backend trả về TOÀN BỘ sản phẩm 1 lần (Client-side slicing)
                    const startIndex = currentPage * PAGE_SIZE;
                    const endIndex = startIndex + PAGE_SIZE;
                    setProducts(resData.slice(startIndex, endIndex));
                    setTotalElements(resData.length);
                    setTotalPages(Math.ceil(resData.length / PAGE_SIZE) || 1);
                } else {
                    // Backend phân trang Server-side nhưng KHÔNG trả totalElements
                    setProducts(resData);
                    const isFullPage = resData.length === PAGE_SIZE;
                    
                    // Nếu nhận đủ PAGE_SIZE items, ước tính còn trang tiếp theo để nút Next hoạt động
                    const estimatedPages = isFullPage ? currentPage + 2 : currentPage + 1;
                    const estimatedTotal = isFullPage 
                        ? (currentPage + 1) * PAGE_SIZE + 1 
                        : (currentPage * PAGE_SIZE) + resData.length;

                    setTotalElements(estimatedTotal);
                    setTotalPages(estimatedPages);
                }
            }
        } catch (error) {
            console.error("Lỗi tải danh sách sản phẩm:", error);
            toast.error("Không thể tải danh sách sản phẩm!");
            setProducts([]);
            setTotalElements(0);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [currentPage, category, debouncedSearch]);

    // ⚡ Debounce riêng cho ô Search (tránh spam API khi gõ phím)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(0); // Reset về trang 1 khi thực hiện tìm kiếm
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // ⚡ Gọi API khi thay đổi Trang hoặc giá trị Search đã debounce
    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    // 🟢 Hàm chuyển trang an toàn & linh hoạt
    const handlePageChange = (newPage: number) => {
        if (newPage >= 0 && newPage < totalPages) {
            setCurrentPage(newPage);
        }
    };

    // 🟢 Thuật toán tính danh sách 10 nút phân trang trượt
    const getPageNumbers = () => {
        const maxButtons = 10;
        let start = Math.max(0, currentPage - 4);
        let end = start + maxButtons;

        if (end > totalPages) {
            end = totalPages;
            start = Math.max(0, end - maxButtons);
        }
        start = Math.max(0, start);

        const pages = [];
        for (let i = start; i < end; i++) {
            pages.push(i);
        }
        return pages;
    };

    const handleOpenAddModal = () => {
        setIsEditMode(false);
        setProductForm({ title: "", price: "", category: "", image_url: "", store: "", stockQuantity: 0 });
        setIsProductModalOpen(true);
    };

    const handleOpenEditModal = (product: Product) => {
        setIsEditMode(true);
        setProductForm({ ...product, stockQuantity: product.stockQuantity ?? 0 });
        setIsProductModalOpen(true);
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("jwtToken");
            const asin = productForm.parent_asin || productForm.asin;

            if (isEditMode && asin) {
                await axios.put(`http://localhost:8080/api/products/${asin}`, productForm, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success("Cập nhật sản phẩm thành công!");
            } else {
                await axios.post("http://localhost:8080/api/products", productForm, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success("Thêm sản phẩm thành công!");
            }

            fetchProducts();
            setIsProductModalOpen(false);
        } catch (error) {
            console.error("Lỗi lưu sản phẩm:", error);
            toast.error("Thao tác thất bại!");
        }
    };

    const handleDeleteProduct = async (asin?: string) => {
        if (!asin || !window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) return;

        try {
            const token = localStorage.getItem("jwtToken");
            await axios.delete(`http://localhost:8080/api/products/${asin}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Xóa sản phẩm thành công!");
            fetchProducts();
        } catch (error) {
            console.error("Lỗi xóa sản phẩm:", error);
            toast.error("Không thể xóa sản phẩm khỏi Server.");
        }
    };

    const handlePaginationModelChange = (model: GridPaginationModel) => {
        setCurrentPage(model.page);
    };

    const columns: GridColDef<Product>[] = [
        {
            field: "image_url",
            headerName: "Image",
            width: 80,
            sortable: false,
            filterable: false,
            renderCell: (params) => {
                const src = params.row.image_url || params.row.image || "https://via.placeholder.com/50";
                return (
                    <img
                        src={src}
                        alt={params.row.title || "Product"}
                        style={{ width: "42px", height: "42px", objectFit: "cover", borderRadius: "6px", border: "1px solid #334155" }}
                    />
                );
            }
        },
        {
            field: "title",
            headerName: "Product Title",
            flex: 2,
            minWidth: 220,
            renderCell: (params) => (
                <span style={{ fontWeight: 600, color: "#f8fafc" }}>{params.value || "N/A"}</span>
            )
        },
        {
            field: "category",
            headerName: "Category",
            flex: 1,
            minWidth: 130,
            valueGetter: (value, row) => value || row.main_category || "General",
            renderCell: (params) => <span style={{ color: "#94a3b8" }}>{params.value}</span>
        },
        {
            field: "price",
            headerName: "Price",
            flex: 1,
            minWidth: 100,
            renderCell: (params) => (
                <span style={{ fontWeight: "bold", color: "#4ade80" }}>
                    ${parseFloat((params.value as string) || "0").toFixed(2)}
                </span>
            )
        },
        {
            field: "stockQuantity",
            headerName: "Stock",
            flex: 1,
            minWidth: 90,
            renderCell: (params) => {
                const stock = params.row.stockQuantity ?? 0;
                return (
                    <span style={{ fontWeight: 600, color: stock > 0 ? "#38bdf8" : "#f87171" }}>
                        {stock}
                    </span>
                );
            }
        },
        {
            field: "actions",
            headerName: "Actions",
            flex: 1.5,
            minWidth: 160,
            align: "right",
            headerAlign: "right",
            sortable: false,
            filterable: false,
            renderCell: (params) => {
                const asin = params.row.parent_asin || params.row.asin;
                return (
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center", height: "100%" }}>
                        <button
                            onClick={() => handleOpenEditModal(params.row)}
                            style={{
                                padding: "6px 12px",
                                backgroundColor: "rgba(56, 189, 248, 0.15)",
                                color: "#38bdf8",
                                border: "1px solid #0284c7",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontWeight: "600",
                                fontSize: "12px"
                            }}
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => handleDeleteProduct(asin)}
                            style={{
                                padding: "6px 12px",
                                backgroundColor: "rgba(239, 68, 68, 0.15)",
                                color: "#f87171",
                                border: "1px solid #ef4444",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontWeight: "600",
                                fontSize: "12px"
                            }}
                        >
                            Delete
                        </button>
                    </div>
                );
            }
        }
    ];

    // Tính chỉ số hiển thị (Ví dụ: 1-100, 101-200)
    const startItem = totalElements === 0 ? 0 : currentPage * PAGE_SIZE + 1;
    const endItem = Math.min((currentPage + 1) * PAGE_SIZE, totalElements);

    return (
        <div style={{ backgroundColor: "#0f172a", minHeight: "100vh", padding: "24px", color: "#ffffff" }}>
            {/* CARD THỐNG KÊ */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "32px" }}>
                <div style={{ background: "#1e293b", padding: "20px", borderRadius: "10px", border: "1px solid #334155" }}>
                    <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "700" }}>TOTAL PRODUCTS</span>
                    <h2 style={{ fontSize: "28px", color: "#38bdf8", margin: "8px 0 0 0" }}>{totalElements}</h2>
                </div>
                <div style={{ background: "#1e293b", padding: "20px", borderRadius: "10px", border: "1px solid #334155" }}>
                    <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "700" }}>TOTAL PAGES</span>
                    <h2 style={{ fontSize: "28px", color: "#4ade80", margin: "8px 0 0 0" }}>{totalPages}</h2>
                </div>
            </div>

            {/* BẢNG QUẢN LÝ SẢN PHẨM */}
            <div style={{ background: "#1e293b", padding: "28px", borderRadius: "12px", border: "1px solid #334155" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: "20px", color: "#f8fafc" }}>Product Catalog Management</h2>
                        <p style={{ margin: "4px 0 0 0", color: "#94a3b8", fontSize: "13px" }}>
                            Quản lý danh mục kho hàng, giá cả và chi tiết sản phẩm.
                        </p>
                    </div>

                    <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            style={{ padding: "10px 14px", borderRadius: "6px", border: "1px solid #334155", backgroundColor: "#0f172a", color: "#fff", fontSize: "14px", width: "180px", outline: "none" }}
                        />

                        <button
                            onClick={handleOpenAddModal}
                            style={{ padding: "10px 18px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "14px" }}
                        >
                            + Add Product
                        </button>
                    </div>
                </div>

                {/* --- MUI DataGrid Table --- */}
                <Paper
                    elevation={0}
                    sx={{
                        height: 700,
                        width: '100%',
                        backgroundColor: '#0f172a',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid #334155',
                    }}
                >
                    <DataGrid
                        rows={products}
                        columns={columns}
                        loading={loading}
                        getRowId={(row) => row.parent_asin || row.asin || row.id || `row-${row.title}`}

                        paginationMode="server"
                        rowCount={totalElements}
                        paginationModel={{
                            page: currentPage,
                            pageSize: PAGE_SIZE
                        }}
                        onPaginationModelChange={handlePaginationModelChange}
                        pageSizeOptions={[100]}

                        hideFooterPagination
                        disableRowSelectionOnClick
                        sx={{
                            border: 0,
                            color: '#ffffff',
                            backgroundColor: '#0f172a',
                            '& .MuiDataGrid-columnHeaders, & .MuiDataGrid-columnHeader, & .MuiDataGrid-columnHeaderRow': {
                                backgroundColor: '#1e293b !important',
                                borderColor: '#334155',
                                color: '#ffffff !important',
                            },
                            '& .MuiDataGrid-columnHeaderTitle': {
                                color: '#ffffff !important',
                                fontWeight: 'bold',
                                fontSize: '13px',
                                textTransform: 'uppercase',
                            },
                            '& .MuiDataGrid-cell': {
                                borderColor: '#334155',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                            },
                            '& .MuiDataGrid-row': {
                                backgroundColor: '#0f172a',
                            },
                            '& .MuiDataGrid-row:hover': {
                                backgroundColor: '#1e293b !important',
                            },
                        }}
                    />
                </Paper>

                {/* 🟢 THANH THÔNG TIN DẢI SẢN PHẨM & BỘ NÚT PHÂN TRANG */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", flexWrap: "wrap", gap: "16px" }}>
                    <div style={{ color: "#94a3b8", fontSize: "14px" }}>
                        Hiển thị <strong style={{ color: "#38bdf8" }}>{startItem} - {endItem}</strong> trong tổng số <strong style={{ color: "#4ade80" }}>{totalElements}</strong> sản phẩm
                    </div>

                    {/* Bộ nút phân trang Custom */}
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        {/* Nút Prev */}
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 0}
                            style={{
                                padding: "8px 16px",
                                borderRadius: "6px",
                                border: "1px solid #334155",
                                backgroundColor: currentPage === 0 ? "#1e293b" : "#0f172a",
                                color: currentPage === 0 ? "#475569" : "#38bdf8",
                                fontWeight: "600",
                                cursor: currentPage === 0 ? "not-allowed" : "pointer",
                                fontSize: "13px"
                            }}
                        >
                            &laquo; Prev
                        </button>

                        {/* Danh sách các nút trang trượt */}
                        {getPageNumbers().map((pageIndex) => {
                            const isSelected = currentPage === pageIndex;
                            return (
                                <button
                                    key={pageIndex}
                                    onClick={() => handlePageChange(pageIndex)}
                                    style={{
                                        minWidth: "38px",
                                        height: "38px",
                                        padding: "0 10px",
                                        borderRadius: "6px",
                                        border: isSelected ? "1px solid #38bdf8" : "1px solid #334155",
                                        backgroundColor: isSelected ? "#0284c7" : "#0f172a",
                                        color: isSelected ? "#ffffff" : "#94a3b8",
                                        fontWeight: isSelected ? "bold" : "500",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        transition: "all 0.2s ease-in-out"
                                    }}
                                >
                                    {pageIndex + 1}
                                </button>
                            );
                        })}

                        {/* Nút Next */}
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages - 1}
                            style={{
                                padding: "8px 16px",
                                borderRadius: "6px",
                                border: "1px solid #334155",
                                backgroundColor: currentPage >= totalPages - 1 ? "#1e293b" : "#0f172a",
                                color: currentPage >= totalPages - 1 ? "#475569" : "#38bdf8",
                                fontWeight: "600",
                                cursor: currentPage >= totalPages - 1 ? "not-allowed" : "pointer",
                                fontSize: "13px"
                            }}
                        >
                            Next &raquo;
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL THÊM MỚI / CHỈNH SỬA SẢN PHẨM */}
            {isProductModalOpen && (
                <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
                    <div style={{ background: "#1e293b", width: "90%", maxWidth: "500px", padding: "28px", borderRadius: "12px", border: "1px solid #334155", color: "#fff" }}>
                        <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#f8fafc", fontSize: "20px" }}>
                            {isEditMode ? "Edit Product" : "Add New Product"}
                        </h3>
                        <form onSubmit={handleSaveProduct} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#94a3b8" }}>Product Title</label>
                                <input
                                    type="text"
                                    required
                                    value={productForm.title || ""}
                                    onChange={e => setProductForm({ ...productForm, title: e.target.value })}
                                    style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #334155", backgroundColor: "#0f172a", color: "#fff", boxSizing: "border-box" }}
                                />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <div>
                                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#94a3b8" }}>Price ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={productForm.price || ""}
                                        onChange={e => setProductForm({ ...productForm, price: e.target.value })}
                                        style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #334155", backgroundColor: "#0f172a", color: "#fff", boxSizing: "border-box" }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#94a3b8" }}>Stock Quantity</label>
                                    <input
                                        type="number"
                                        min="0"
                                        required
                                        value={productForm.stockQuantity ?? 0}
                                        onChange={e => setProductForm({ ...productForm, stockQuantity: parseInt(e.target.value, 10) || 0 })}
                                        style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #334155", backgroundColor: "#0f172a", color: "#fff", boxSizing: "border-box" }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#94a3b8" }}>Category</label>
                                <input
                                    type="text"
                                    value={productForm.category || ""}
                                    onChange={e => setProductForm({ ...productForm, category: e.target.value })}
                                    style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #334155", backgroundColor: "#0f172a", color: "#fff", boxSizing: "border-box" }}
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#94a3b8" }}>Image URL</label>
                                <input
                                    type="text"
                                    value={productForm.image_url || ""}
                                    onChange={e => setProductForm({ ...productForm, image_url: e.target.value })}
                                    style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #334155", backgroundColor: "#0f172a", color: "#fff", boxSizing: "border-box" }}
                                />
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
                                <button
                                    type="button"
                                    onClick={() => setIsProductModalOpen(false)}
                                    style={{ padding: "10px 18px", backgroundColor: "transparent", color: "#94a3b8", border: "1px solid #334155", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: "10px 18px", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                                >
                                    {isEditMode ? "Update Product" : "Save Product"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}