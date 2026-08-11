import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import type { Order } from "../../types/admin";

// --- MUI Components ---
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";

export default function OrderAdminPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const paginationModel = { page: 0, pageSize: 5 };

    // --- Fetch Danh Sách Đơn Hàng từ API ---
    useEffect(() => {
        const fetchOrders = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem("jwtToken") || localStorage.getItem("token");

                const response = await axios.get("http://localhost:8080/api/orders", {
                    headers: {
                        Authorization: token ? `Bearer ${token}` : ""
                    }
                });
                const responseData = response.data;
                console.log("Fetched orders data:", responseData);

                setOrders(responseData);

            } catch (error) {
                console.error("Error fetching orders:", error);
                toast.error("Failed to load orders list!");
                setOrders([]);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    // --- Cập nhật Trạng Thái Đơn Hàng ---
    const updateOrderStatus = async (orderId: string | number, newStatus: Order["status"]) => {
        try {
            const token = localStorage.getItem("jwtToken") || localStorage.getItem("token");

            const response = await axios.put<Order>(
                `http://localhost:8080/api/orders/${orderId}/status?status=${newStatus}`,
                {},
                {
                    headers: {
                        Authorization: token ? `Bearer ${token}` : ""
                    }
                }
            );

            const updatedOrder = response.data;

            setOrders(prevOrders =>
                Array.isArray(prevOrders)
                    ? prevOrders.map(o => (o.id === orderId ? updatedOrder : o))
                    : []
            );

            toast.success(`Order ${orderId} updated to ${newStatus}`);
        } catch (error) {
            console.error("Error updating order status:", error);
            toast.error("Failed to update order status!");
        }
    };

    const safeOrdersList = Array.isArray(orders) ? orders : [];

    // Tính tổng doanh thu (Ưu tiên lấy totalPrice từ backend, nếu không có mới lấy totalAmount)
    const totalRevenue = safeOrdersList.reduce((acc, order: any) => acc + (order.totalPrice ?? order.totalAmount ?? 0), 0);

    // --- Cấu hình các cột (Columns) ---
    const columns: GridColDef<Order>[] = [
        {
            field: "id",
            headerName: "Order ID",
            flex: 1,
            minWidth: 100,
            renderCell: (params) => (
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#38bdf8" }}>
                    #{params.value}
                </span>
            )
        },
        {
            field: "user",
            headerName: "User ID",
            flex: 1,
            minWidth: 130,
            // Sửa lỗi: Lấy user.id hoặc user.email/username từ object user
            renderCell: (params) => {
                const user = params.row?.user as any;
                const displayUser = user?.id ? `User #${user.id}` : (params.row as any)?.userId || "N/A";
                return (
                    <span style={{ color: "#94a3b8" }}>
                        {displayUser}
                    </span>
                );
            }
        },
        {
            field: "createdAt",
            headerName: "Date",
            flex: 1.2,
            minWidth: 160,
            // Format ngày giờ cho dễ nhìn
            renderCell: (params) => {
                if (!params.value) return "N/A";
                const date = new Date(params.value);
                return (
                    <span style={{ color: "#cbd5e1", fontSize: "13px" }}>
                        {date.toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                        })}
                    </span>
                );
            }
        },
        {
            field: "totalPrice",
            headerName: "Total Amount",
            flex: 1,
            minWidth: 130,
            // Sửa lỗi: Lấy totalPrice hoặc totalAmount
            renderCell: (params) => {
                const amount = params.row?.totalPrice ?? (params.row as any)?.totalAmount ?? 0;
                return (
                    <span style={{ fontWeight: "bold", color: "#ffffff" }}>
                        ${Number(amount).toFixed(2)}
                    </span>
                );
            }
        },
        {
            field: "status",
            headerName: "Status",
            flex: 1,
            minWidth: 140,
            renderCell: (params) => {
                const status = params.value;
                let bg = "rgba(250, 204, 21, 0.2)";
                let color = "#facc15";
                let border = "1px solid #eab308";

                if (status === "DELIVERED") {
                    bg = "rgba(74, 222, 128, 0.2)";
                    color = "#4ade80";
                    border = "1px solid #22c55e";
                } else if (status === "SHIPPED") {
                    bg = "rgba(56, 189, 248, 0.2)";
                    color = "#38bdf8";
                    border = "1px solid #38bdf8";
                } else if (status === "CANCELLED") {
                    bg = "rgba(239, 68, 68, 0.2)";
                    color = "#f87171";
                    border = "1px solid #ef4444";
                }

                return (
                    <Chip
                        label={status || "PENDING"}
                        size="small"
                        sx={{
                            fontWeight: 700,
                            fontSize: "11px",
                            backgroundColor: bg,
                            color: color,
                            border: border
                        }}
                    />
                );
            }
        },
        {
            field: "actions",
            headerName: "Update Status",
            flex: 1.2,
            minWidth: 160,
            sortable: false,
            filterable: false,
            align: "right",
            headerAlign: "right",
            renderCell: (params) => {
                const order = params.row;
                return (
                    <select
                        value={order.status || "PENDING"}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value as Order["status"])}
                        style={{
                            padding: "6px 10px",
                            backgroundColor: "#0f172a",
                            color: "#ffffff",
                            border: "1px solid #334155",
                            borderRadius: "6px",
                            fontSize: "12px",
                            cursor: "pointer",
                            outline: "none"
                        }}
                    >
                        <option value="PENDING">PENDING</option>
                        <option value="SHIPPED">SHIPPED</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="CANCELLED">CANCELLED</option>
                    </select>
                );
            }
        }
    ];

    return (
        <div style={{ backgroundColor: "#0f172a", minHeight: "100vh", padding: "24px", color: "#ffffff" }}>
            {/* Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "32px" }}>
                <div style={{ background: "#1e293b", padding: "20px", borderRadius: "10px", border: "1px solid #334155" }}>
                    <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "700" }}>TOTAL ORDERS</span>
                    <h2 style={{ fontSize: "28px", color: "#facc15", margin: "8px 0 0 0" }}>
                        {loading ? "..." : safeOrdersList.length}
                    </h2>
                </div>
                <div style={{ background: "#1e293b", padding: "20px", borderRadius: "10px", border: "1px solid #334155" }}>
                    <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "700" }}>REVENUE</span>
                    <h2 style={{ fontSize: "28px", color: "#c084fc", margin: "8px 0 0 0" }}>
                        {loading ? "..." : `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </h2>
                </div>
            </div>

            {/* Container Bảng */}
            <div style={{ background: "#1e293b", padding: "28px", borderRadius: "12px", border: "1px solid #334155" }}>
                <div style={{ marginBottom: "24px" }}>
                    <h2 style={{ margin: 0, fontSize: "20px", color: "#ffffff" }}>Customer Orders</h2>
                    <p style={{ margin: "4px 0 0 0", color: "#94a3b8", fontSize: "13px" }}>
                        Track purchases, payment status, and order fulfillments.
                    </p>
                </div>

                {/* MUI DataGrid Table */}
                <Paper
                    elevation={0}
                    sx={{
                        height: 480,
                        width: '100%',
                        backgroundColor: '#0f172a',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid #334155',
                    }}
                >
                    <DataGrid
                        rows={safeOrdersList}
                        columns={columns}
                        loading={loading}
                        initialState={{ pagination: { paginationModel } }}
                        pageSizeOptions={[5, 10, 20]}
                        checkboxSelection
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
                            '& .MuiDataGrid-iconButtonContainer, & .MuiDataGrid-menuIcon, & .MuiDataGrid-sortIcon, & .MuiDataGrid-columnHeader .MuiSvgIcon-root': {
                                color: '#ffffff !important',
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
                            '& .MuiDataGrid-row.Mui-selected': {
                                backgroundColor: 'rgba(56, 189, 248, 0.15) !important',
                            },

                            '& .MuiDataGrid-footerContainer': {
                                backgroundColor: '#1e293b',
                                borderColor: '#334155',
                                color: '#ffffff',
                            },
                            '& .MuiTablePagination-root, & .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows, & .MuiTablePagination-select': {
                                color: '#ffffff',
                            },
                            '& .MuiTablePagination-selectIcon': {
                                color: '#ffffff',
                            },
                            '& .MuiIconButton-root': {
                                color: '#ffffff',
                            },
                            '& .MuiIconButton-root.Mui-disabled': {
                                color: '#475569',
                            },

                            '& .MuiCheckbox-root': {
                                color: '#94a3b8',
                            },
                            '& .MuiCheckbox-root.Mui-checked': {
                                color: '#38bdf8',
                            },

                            '& .MuiDataGrid-overlay': {
                                backgroundColor: '#0f172a',
                                color: '#ffffff',
                            },
                        }}
                    />
                </Paper>
            </div>
        </div>
    );
}