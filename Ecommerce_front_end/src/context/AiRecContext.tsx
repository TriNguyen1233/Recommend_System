import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import axios from "axios";
import { aiRecommendationSeeds } from "../data/dataSeeds.ts";

interface Product {
    parent_asin: string;
    title: string;
    price: number | string;
    main_category: string;
    category: string;
    image_url: string;
    store: string;
}

// Bỏ SearchInputData vì chúng ta tự động generate payload
interface AiRecContextType {
    aiRecs: Product[];
    isAiLoading: boolean;
    aiError: string | null;
    // Bỏ triggerAiSearch vì hệ thống tự chạy
}

// Khởi tạo Context
const AiRecContext = createContext<AiRecContextType | undefined>(undefined);

export const AiRecProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // 1. Khởi tạo state từ LocalStorage
    const [aiRecs, setAiRecs] = useState<Product[]>(() => {
        const savedRecs = localStorage.getItem("aiRecommendations");
        if (savedRecs) {
            try {
                return JSON.parse(savedRecs);
            } catch (error) {
                console.error("Lỗi parse localStorage:", error);
                return aiRecommendationSeeds;
            }
        }
        return aiRecommendationSeeds;
    });

    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    // 2. Tiến trình tự động chạy ngầm khi App khởi chạy
    useEffect(() => {
        let isMounted = true; 

        const fetchAutoRecommendations = async () => {
            try {
                setIsAiLoading(true);
                setAiError(null);

                // Lấy user_id tự động từ localStorage (Nếu người dùng đã đăng nhập)
                // Thay "userId" bằng key thực tế bạn đang dùng, nếu chưa có thì để default
                const currentUserId = localStorage.getItem("userId") || "guest_user";

                const autoPayload = {
                    user_id: currentUserId,
                    search: "General recommendations based on user preference", // Prompt mặc định cho hệ thống AI
                    category: ""
                };

                console.log("Tự động phân tích AI Recs cho:", currentUserId);

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

                if (isMounted) {
                    // Nếu kết quả rỗng, giữ lại data cũ trong localStorage để không bị trống UI
                    if (resultData.length > 0) {
                        setAiRecs(resultData);
                        localStorage.setItem("aiRecommendations", JSON.stringify(resultData));
                    }
                }

            } catch (error) {
                console.error("AI Fetch Error:", error);
                if (isMounted) {
                    setAiError("Không thể kết nối với dịch vụ AI.");
                }
            } finally {
                if (isMounted) {
                    setIsAiLoading(false);
                }
            }
        };

        // Kích hoạt ngay lập tức
        fetchAutoRecommendations();

        return () => {
            isMounted = false;
        };
    }, []); // <-- Dependency array rỗng [] đảm bảo chỉ chạy 1 lần duy nhất khi App load

    return (
        <AiRecContext.Provider value={{ aiRecs, isAiLoading, aiError }}>
            {children}
        </AiRecContext.Provider>
    );
};

// Custom hook để consume context
// eslint-disable-next-line react-refresh/only-export-components
export const useAiRec = () => {
    const context = useContext(AiRecContext);
    if (context === undefined) {
        throw new Error("useAiRec phải được sử dụng bên trong AiRecProvider");
    }
    return context;
};