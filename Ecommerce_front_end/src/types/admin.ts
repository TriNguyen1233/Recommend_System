export interface Product {
    asin?: string;
    parent_asin?: string;
    title: string;
    price: number | string;
    category?: string;
    image_url?: string;
    store?: string;
}

export interface User {
    id: string;
    username: string;
    email: string;
    role: "ADMIN" | "USER";
    status?: "ACTIVE" | "BLOCKED";
}

export interface Order {
    id: string;
    userId: string;
    totalAmount: number;
    status: "PENDING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
    createdAt: string;
}