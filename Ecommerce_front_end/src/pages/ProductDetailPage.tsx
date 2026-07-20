import { Suspense, useRef, useState } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import Header from '../components/Header.tsx';
import Asus_Model from '../3d_animations/asus_animation.tsx';
import '../css/App.css';

interface Product {
    parent_asin: string;
    title: string;
    price: number | string;
    main_category: string;
    category: string;
    image_url: string;
    store: string;
    description?: string;
    specs?: { [key: string]: string };
}

// Dữ liệu mẫu sản phẩm chi tiết
const mockProductDetail: Product = {
    parent_asin: "B08N5WRWNW",
    title: "Laptop ASUS ROG Strix G15 (2026 Edition) - AMD Ryzen 9, RTX 4070, 16GB RAM, 1TB SSD",
    price: 1299.99,
    main_category: "Electronics",
    category: "Laptops & Computers",
    image_url: "https://via.placeholder.com/400x300",
    store: "ASUS Official Store",
    description: "Trải nghiệm hiệu năng vượt trội với ASUS ROG Strix G15. Được trang bị vi xử lý thế hệ mới và card đồ họa cực mạnh, sẵn sàng cho mọi tác vụ đồ họa nặng và chiến các tựa game AAA đỉnh cao.",
    specs: {
        "CPU": "AMD Ryzen 9 7940HS",
        "GPU": "NVIDIA GeForce RTX 4070 8GB",
        "RAM": "16GB DDR5 4800MHz",
        "Storage": "1TB PCIe 4.0 NVMe M.2 SSD",
        "Display": "15.6 inch QHD 240Hz 100% DCI-P3"
    }
};

function ProductDetailPage() {
    const { id } = useParams<{ id: string }>();
    const detailsRef = useRef<HTMLDivElement | null>(null);

    const [quantity, setQuantity] = useState<number>(1);
    const [viewMode, setViewMode] = useState<'3d' | 'image'>('3d'); // Chuyển đổi giữa xem 3D và Hình ảnh

    // GSAP Animation hiệu ứng xuất hiện thông tin sản phẩm
    useGSAP(() => {
        gsap.from(".product-animate", {
            y: 30,
            opacity: 0,
            duration: 0.6,
            stagger: 0.1,
            ease: "power2.out"
        });
    }, { scope: detailsRef });

    return (
        <div style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
            <Header />

            {/* Breadcrumb Navigation */}
            <div style={{ padding: '15px 50px', background: '#f8f9fa', borderBottom: '1px solid #e9ecef', fontSize: '14px', color: '#6c757d' }}>
                <NavLink to="/" style={{ color: '#0d6efd', textDecoration: 'none' }}>Home</NavLink> / 
                <span style={{ margin: '0 8px' }}>{mockProductDetail.main_category}</span> / 
                <strong style={{ color: '#333' }}> {mockProductDetail.title}</strong>
            </div>

            {/* MAIN CONTENT CONTAINER */}
            <div ref={detailsRef} style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
                
                {/* KHU VỰC CHÍNH: 3D MODEL / IMAGE + INFO SẢN PHẨM */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '40px' }}>
                    
                    {/* 1. KHU VỰC HIỂN THỊ MEDIA (3D / IMAGE) */}
                    <div>
                        <div style={{ 
                            width: '100%', 
                            height: '420px', 
                            border: '1px solid #e0e0e0', 
                            borderRadius: '12px', 
                            overflow: 'hidden', 
                            position: 'relative',
                            background: viewMode === '3d' ? '#f8f9fa' : '#ffffff' 
                        }}>
                            {viewMode === '3d' ? (
                                <Canvas camera={{ position: [5, 1, 5], fov: 20 }}>
                                    <Suspense fallback={null}>
                                        <Stage environment="city" intensity={0.6}>
                                            <Asus_Model />
                                        </Stage>
                                    </Suspense>
                                    <OrbitControls makeDefault enableZoom={false} />
                                </Canvas>
                            ) : (
                                <img 
                                    src={mockProductDetail.image_url} 
                                    alt={mockProductDetail.title} 
                                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '20px' }} 
                                />
                            )}

                            {/* Tag thông báo interactive 3D */}
                            {viewMode === '3d' && (
                                <span style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '12px', padding: '4px 10px', borderRadius: '4px' }}>
                                    🖱️ Xoay 3D để xem góc nhìn
                                </span>
                            )}
                        </div>

                        {/* Nút chuyển đổi chế độ xem Image / 3D Model */}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'center' }}>
                            <button 
                                onClick={() => setViewMode('3d')} 
                                style={{ padding: '8px 20px', borderRadius: '20px', border: '1px solid #0d6efd', background: viewMode === '3d' ? '#0d6efd' : '#fff', color: viewMode === '3d' ? '#fff' : '#0d6efd', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                            >
                                🌐 3D Interactive View
                            </button>
                            <button 
                                onClick={() => setViewMode('image')} 
                                style={{ padding: '8px 20px', borderRadius: '20px', border: '1px solid #0d6efd', background: viewMode === 'image' ? '#0d6efd' : '#fff', color: viewMode === 'image' ? '#fff' : '#0d6efd', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                            >
                                🖼️ Static Image
                            </button>
                        </div>
                    </div>

                    {/* 2. KHU VỰC THÔNG TIN SẢN PHẨM & MUA HÀNG */}
                    <div>
                        <span className="product-animate" style={{ fontSize: '13px', color: '#0d6efd', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {mockProductDetail.store}
                        </span>
                        <h1 className="product-animate" style={{ fontSize: '28px', fontWeight: 'bold', color: '#111', margin: '10px 0 15px 0', lineHeight: '1.3' }}>
                            {mockProductDetail.title}
                        </h1>

                        <div className="product-animate" style={{ fontSize: '32px', fontWeight: '800', color: '#0d6efd', marginBottom: '20px' }}>
                            ${mockProductDetail.price}
                        </div>

                        <p className="product-animate" style={{ fontSize: '15px', color: '#555', lineHeight: '1.6', marginBottom: '25px' }}>
                            {mockProductDetail.description}
                        </p>

                        {/* Chọn số lượng */}
                        <div className="product-animate" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
                            <label style={{ fontWeight: 'bold', fontSize: '15px', color: '#333' }}>Số lượng:</label>
                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ced4da', borderRadius: '6px', overflow: 'hidden' }}>
                                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ padding: '8px 16px', background: '#f8f9fa', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                                <span style={{ padding: '8px 20px', fontSize: '15px', fontWeight: 'bold' }}>{quantity}</span>
                                <button onClick={() => setQuantity(quantity + 1)} style={{ padding: '8px 16px', background: '#f8f9fa', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                            </div>
                        </div>

                        {/* Các nút Thêm vào giỏ & Mua ngay */}
                        <div className="product-animate" style={{ display: 'flex', gap: '15px' }}>
                            <button style={{ flex: '1', padding: '14px', backgroundColor: '#e7f1ff', color: '#0d6efd', border: '1px solid #0d6efd', borderRadius: '6px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
                                🛒 Add to Cart
                            </button>
                            <button style={{ flex: '1', padding: '14px', backgroundColor: '#0d6efd', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
                                ⚡ Buy Now
                            </button>
                        </div>
                    </div>
                </div>

                {/* TAB THÔNG SỐ KỸ THUẬT SẢN PHẨM */}
                <div style={{ marginTop: '50px', background: '#ffffff', padding: '30px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                    <h3 style={{ borderBottom: '2px solid #0d6efd', paddingBottom: '10px', margin: '0 0 20px 0', color: '#333', display: 'inline-block', fontSize: '20px' }}>
                        Technical Specifications
                    </h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
                        <tbody>
                            {mockProductDetail.specs && Object.entries(mockProductDetail.specs).map(([key, val], idx) => (
                                <tr key={key} style={{ backgroundColor: idx % 2 === 0 ? '#f8f9fa' : '#ffffff' }}>
                                    <td style={{ padding: '14px', fontWeight: 'bold', color: '#555', width: '25%', borderBottom: '1px solid #eee' }}>{key}</td>
                                    <td style={{ padding: '14px', color: '#333', borderBottom: '1px solid #eee' }}>{val}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
}

export default ProductDetailPage;