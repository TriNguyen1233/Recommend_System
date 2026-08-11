import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";

interface Requirement {
    id: number;
    userId: string;
    title: string;
    description: string;
    budget: number;
    type: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    adminNote?: string;
    createdAt: string;
    updatedAt: string;
}

export default function RequestAdminPage() {
    const [requirements, setRequirements] = useState<Requirement[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [filterStatus, setFilterStatus] = useState<string>("ALL");

    // Modal state for Approval / Rejection
    const [selectedReq, setSelectedReq] = useState<Requirement | null>(null);
    const [modalAction, setModalAction] = useState<"APPROVED" | "REJECTED" | null>(null);
    const [adminNote, setAdminNote] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Fetch requirements API
    const fetchRequirements = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("jwtToken") || localStorage.getItem("token");
            const response = await axios.get("http://localhost:8080/api/requirements", {
                headers: {
                    Authorization: token ? `Bearer ${token}` : ""
                }
            });

            // Safe data type validation
            const data = response.data;
            if (Array.isArray(data)) {
                setRequirements(data);
            } else if (Array.isArray(data?.content)) {
                setRequirements(data.content);
            } else if (Array.isArray(data?.data)) {
                setRequirements(data.data);
            } else {
                setRequirements([]);
            }
        } catch (error: any) {
            console.error("Fetch requirements error:", error);
            toast.error(error.response?.data?.message || "Failed to load requirements list!");
            setRequirements([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRequirements();
    }, [fetchRequirements]);

    // Open Modal
    const openModal = (req: Requirement, action: "APPROVED" | "REJECTED") => {
        setSelectedReq(req);
        setModalAction(action);
        setAdminNote(action === "APPROVED" ? "Approved admin privilege request." : "Request rejected.");
    };

    // Close Modal
    const closeModal = () => {
        setSelectedReq(null);
        setModalAction(null);
        setAdminNote("");
    };

    // Send update request to Backend API
    const handleConfirmStatusUpdate = async () => {
        if (!selectedReq || !modalAction) return;

        try {
            setIsSubmitting(true);
            const token = localStorage.getItem("jwtToken") || localStorage.getItem("token");

            await axios.put(
                `http://localhost:8080/api/requirements/${selectedReq.id}/status`,
                {
                    status: modalAction,
                    adminNote: adminNote.trim()
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: token ? `Bearer ${token}` : ""
                    }
                }
            );

            toast.success(
                modalAction === "APPROVED"
                    ? "🎉 Requirement approved & Admin role granted successfully!"
                    : "❌ Requirement rejected!"
            );

            // Optimistic UI update
            setRequirements((prevReqs) =>
                prevReqs.map((req) =>
                    req.id === selectedReq.id
                        ? { ...req, status: modalAction, adminNote: adminNote.trim() }
                        : req
                )
            );

            closeModal();

            // Refetch to sync with server
            fetchRequirements();
        } catch (error: any) {
            console.error("Update status error:", error);
            toast.error(error.response?.data?.message || "Failed to update status!");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Ensure requirements is always an array
    const safeRequirements = Array.isArray(requirements) ? requirements : [];

    // Filter list by tab status
    const filteredRequirements = safeRequirements.filter((req) => {
        if (filterStatus === "ALL") return true;
        return req.status === filterStatus;
    });

    // Render Status Badge
    const renderStatusBadge = (status: string) => {
        switch (status) {
            case "APPROVED":
                return <span style={{ padding: "4px 10px", borderRadius: "20px", backgroundColor: "rgba(34, 197, 94, 0.15)", color: "#4ade80", border: "1px solid #22c55e", fontSize: "12px", fontWeight: "bold" }}>APPROVED</span>;
            case "REJECTED":
                return <span style={{ padding: "4px 10px", borderRadius: "20px", backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "1px solid #ef4444", fontSize: "12px", fontWeight: "bold" }}>REJECTED</span>;
            default:
                return <span style={{ padding: "4px 10px", borderRadius: "20px", backgroundColor: "rgba(234, 179, 8, 0.15)", color: "#facc15", border: "1px solid #eab308", fontSize: "12px", fontWeight: "bold" }}>PENDING</span>;
        }
    };

    return (
        <div style={{ color: "#f8fafc" }}>
            {/* PAGE TITLE */}
            <div style={{ marginBottom: "28px" }}>
                <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#f8fafc", margin: "0 0 6px 0" }}>
                    📩 User Requests Management
                </h1>
                <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>
                    View and manage user requests for Admin role upgrades.
                </p>
            </div>

            {/* FILTER TABS */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                {["ALL", "PENDING", "APPROVED", "REJECTED"].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        style={{
                            padding: "8px 18px",
                            borderRadius: "6px",
                            border: "1px solid #334155",
                            backgroundColor: filterStatus === status ? "#38bdf8" : "#1e293b",
                            color: filterStatus === status ? "#0f172a" : "#94a3b8",
                            fontWeight: "bold",
                            fontSize: "13px",
                            cursor: "pointer",
                            transition: "all 0.2s"
                        }}
                    >
                        {status} {status === "ALL" ? `(${safeRequirements.length})` : `(${safeRequirements.filter(r => r.status === status).length})`}
                    </button>
                ))}
            </div>

            {/* TABLE LIST */}
            <div style={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "1px solid #334155", overflow: "hidden" }}>
                {loading ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                        ⏳ Loading requests list...
                    </div>
                ) : filteredRequirements.length === 0 ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                        No requests found in this category.
                    </div>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", textAlign: "left" }}>
                        <thead>
                            <tr style={{ backgroundColor: "#0f172a", color: "#94a3b8", borderBottom: "1px solid #334155" }}>
                                <th style={{ padding: "14px 18px" }}>ID</th>
                                <th style={{ padding: "14px 18px" }}>User ID</th>
                                <th style={{ padding: "14px 18px" }}>Request Type</th>
                                <th style={{ padding: "14px 18px" }}>Description / Reason</th>
                                <th style={{ padding: "14px 18px" }}>Created At</th>
                                <th style={{ padding: "14px 18px" }}>Status</th>
                                <th style={{ padding: "14px 18px", textAlign: "center" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRequirements.map((req) => (
                                <tr key={req.id} style={{ borderBottom: "1px solid #334155", transition: "background 0.2s" }}>
                                    <td style={{ padding: "14px 18px", fontWeight: "bold", color: "#38bdf8" }}>#{req.id}</td>
                                    <td style={{ padding: "14px 18px", color: "#cbd5e1" }}>{req.userId}</td>
                                    <td style={{ padding: "14px 18px" }}>
                                        <span style={{ padding: "3px 8px", borderRadius: "4px", backgroundColor: "rgba(56, 189, 248, 0.1)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.3)", fontSize: "12px", fontWeight: "bold" }}>
                                            {req.type}
                                        </span>
                                    </td>
                                    <td style={{ padding: "14px 18px", color: "#e2e8f0", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={req.description}>
                                        {req.description}
                                    </td>
                                    <td style={{ padding: "14px 18px", color: "#94a3b8", fontSize: "13px" }}>
                                        {new Date(req.createdAt).toLocaleString("en-US")}
                                    </td>
                                    <td style={{ padding: "14px 18px" }}>
                                        {renderStatusBadge(req.status)}
                                    </td>
                                    <td style={{ padding: "14px 18px", textAlign: "center" }}>
                                        {req.status === "PENDING" ? (
                                            <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                                                <button
                                                    onClick={() => openModal(req, "APPROVED")}
                                                    style={{ padding: "6px 12px", backgroundColor: "#16a34a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => openModal(req, "REJECTED")}
                                                    style={{ padding: "6px 12px", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>
                                                {req.adminNote || "Processed"}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ACTION MODAL */}
            {selectedReq && modalAction && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                    <div style={{ backgroundColor: "#1e293b", borderRadius: "12px", width: "450px", padding: "24px", border: "1px solid #334155", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
                        <h3 style={{ margin: "0 0 12px 0", color: modalAction === "APPROVED" ? "#4ade80" : "#f87171", fontSize: "18px" }}>
                            {modalAction === "APPROVED" ? "✅ Approve Admin Request" : "❌ Reject Request"}
                        </h3>

                        <p style={{ color: "#cbd5e1", fontSize: "14px", marginBottom: "16px" }}>
                            You are about to {modalAction === "APPROVED" ? "approve" : "reject"} request <strong>#{selectedReq.id}</strong> from User ID: <strong>{selectedReq.userId}</strong>.
                        </p>

                        <div style={{ marginBottom: "18px" }}>
                            <label style={{ display: "block", color: "#94a3b8", fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>
                                Admin Note:
                            </label>
                            <textarea
                                rows={3}
                                value={adminNote}
                                onChange={(e) => setAdminNote(e.target.value)}
                                placeholder="Enter a message for the user..."
                                style={{
                                    width: "100%",
                                    backgroundColor: "#0f172a",
                                    border: "1px solid #334155",
                                    color: "#f8fafc",
                                    borderRadius: "6px",
                                    padding: "10px",
                                    boxSizing: "border-box",
                                    fontFamily: "inherit"
                                }}
                            />
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                            <button
                                onClick={closeModal}
                                disabled={isSubmitting}
                                style={{ padding: "8px 16px", backgroundColor: "#475569", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleConfirmStatusUpdate}
                                disabled={isSubmitting}
                                style={{
                                    padding: "8px 20px",
                                    backgroundColor: modalAction === "APPROVED" ? "#16a34a" : "#dc2626",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "6px",
                                    fontWeight: "bold",
                                    cursor: isSubmitting ? "not-allowed" : "pointer"
                                }}
                            >
                                {isSubmitting ? "Processing..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}