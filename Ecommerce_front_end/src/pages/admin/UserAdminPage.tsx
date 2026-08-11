import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import type { User } from "../../types/admin";

// --- MUI Components ---
import { DataGrid, type GridColDef } from "@mui/x-data-grid"; 
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";

export default function UserAdminPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const paginationModel = { page: 0, pageSize: 5 };

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem("jwtToken") || localStorage.getItem("token");

                const response = await axios.get("http://localhost:8080/api/admin/users", {
                    headers: {
                        Authorization: token ? `Bearer ${token}` : ""
                    }
                });
                const responseData = response.data;

                if (Array.isArray(responseData)) {
                    setUsers(responseData);
                } else if (responseData && Array.isArray(responseData.content)) {
                    setUsers(responseData.content);
                } else if (responseData && Array.isArray(responseData.data)) {
                    setUsers(responseData.data);
                } else {
                    setUsers([]);
                }
            } catch (error) {
                console.error("Error fetching users:", error);
                toast.error("Failed to load users list!");
                setUsers([]);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const toggleUserStatus = async (user: User) => {
        const nextStatus = user.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";

        try {
            const token = localStorage.getItem("jwtToken") || localStorage.getItem("token");

            const response = await axios.put<User>(
                `http://localhost:8080/api/admin/users/${user.id}/status`,
                JSON.stringify(nextStatus),
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: token ? `Bearer ${token}` : ""
                    },
                }
            );

            const updatedUser = response.data;

            setUsers(prevUsers =>
                Array.isArray(prevUsers)
                    ? prevUsers.map(u => (u.id === user.id ? updatedUser : u))
                    : []
            );

            toast.success(`Updated status for ${updatedUser.username} to ${nextStatus}`);
        } catch (error) {
            console.error("Error updating user status:", error);
            toast.error("Failed to update user status!");
        }
    };

    const safeUsersList = Array.isArray(users) ? users : [];

    // --- Cấu hình các cột (Columns) ---
    const columns: GridColDef<User>[] = [
        {
            field: "id",
            headerName: "User ID",
            flex: 1.2,
            minWidth: 160,
            renderCell: (params) => (
                <span style={{ fontFamily: "monospace", color: "#cbd5e1" }}>
                    {params.value}
                </span>
            )
        },
        {
            field: "username",
            headerName: "Username",
            flex: 1,
            minWidth: 130,
            renderCell: (params) => (
                <span style={{ fontWeight: 600, color: "#ffffff" }}>
                    {params.value}
                </span>
            )
        },
        {
            field: "email",
            headerName: "Email",
            flex: 1.5,
            minWidth: 180,
            renderCell: (params) => (
                <span style={{ color: "#f1f5f9" }}>{params.value}</span>
            )
        },
        {
            field: "role",
            headerName: "Role",
            flex: 0.8,
            minWidth: 100,
            renderCell: (params) => {
                const isAdmin = params.value === "ADMIN";
                return (
                    <Chip
                        label={params.value}
                        size="small"
                        sx={{
                            fontWeight: 700,
                            fontSize: "11px",
                            backgroundColor: isAdmin ? "rgba(56, 189, 248, 0.2)" : "rgba(148, 163, 184, 0.2)",
                            color: isAdmin ? "#38bdf8" : "#e2e8f0",
                            border: isAdmin ? "1px solid #38bdf8" : "1px solid #64748b"
                        }}
                    />
                );
            }
        },
        {
            field: "status",
            headerName: "Status",
            flex: 0.8,
            minWidth: 110,
            renderCell: (params) => {
                const status = params.value || "ACTIVE";
                const isActive = status === "ACTIVE";
                return (
                    <Chip
                        label={status}
                        size="small"
                        sx={{
                            fontWeight: 700,
                            fontSize: "11px",
                            backgroundColor: isActive ? "rgba(74, 222, 128, 0.2)" : "rgba(239, 68, 68, 0.2)",
                            color: isActive ? "#4ade80" : "#f87171",
                            border: isActive ? "1px solid #22c55e" : "1px solid #ef4444"
                        }}
                    />
                );
            }
        },
        {
            field: "actions",
            headerName: "Actions",
            flex: 1,
            minWidth: 130,
            sortable: false,
            filterable: false,
            align: "right",
            headerAlign: "right",
            renderCell: (params) => {
                const user = params.row;
                if (user.role === "ADMIN") return null;

                const isActive = user.status === "ACTIVE";

                return (
                    <Button
                        size="small"
                        onClick={() => toggleUserStatus(user)}
                        sx={{
                            textTransform: "none",
                            fontWeight: "bold",
                            fontSize: "12px",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            color: isActive ? "#f87171" : "#4ade80",
                            backgroundColor: isActive ? "rgba(239, 68, 68, 0.15)" : "rgba(74, 222, 128, 0.15)",
                            border: isActive ? "1px solid #ef4444" : "1px solid #22c55e",
                            "&:hover": {
                                backgroundColor: isActive ? "rgba(239, 68, 68, 0.3)" : "rgba(74, 222, 128, 0.3)"
                            }
                        }}
                    >
                        {isActive ? "Block User" : "Unblock User"}
                    </Button>
                );
            }
        }
    ];

    return (
        <div style={{ backgroundColor: "#0f172a", minHeight: "100vh", padding: "24px", color: "#ffffff" }}>
            {/* Stat Card */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "32px" }}>
                <div style={{ background: "#1e293b", padding: "20px", borderRadius: "10px", border: "1px solid #334155" }}>
                    <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "700" }}>REGISTERED USERS</span>
                    <h2 style={{ fontSize: "28px", color: "#4ade80", margin: "8px 0 0 0" }}>
                        {loading ? "..." : safeUsersList.length}
                    </h2>
                </div>
            </div>

            {/* Container Bảng */}
            <div style={{ background: "#1e293b", padding: "28px", borderRadius: "12px", border: "1px solid #334155" }}>
                <div style={{ marginBottom: "24px" }}>
                    <h2 style={{ margin: 0, fontSize: "20px", color: "#ffffff" }}>User Accounts</h2>
                    <p style={{ margin: "4px 0 0 0", color: "#94a3b8", fontSize: "13px" }}>
                        Manage registered customers, roles, and access controls.
                    </p>
                </div>

                {/* --- MUI DataGrid Table (Header nền tối - Chữ trắng) --- */}
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
                        rows={safeUsersList}
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

                            // --- Fix Header Background & Text ---
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

                            // Cell & Row
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

                            // Footer & Phân trang (Pagination)
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

                            // Checkbox
                            '& .MuiCheckbox-root': {
                                color: '#94a3b8',
                            },
                            '& .MuiCheckbox-root.Mui-checked': {
                                color: '#38bdf8',
                            },

                            // Màn hình trống / Loading overlay
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