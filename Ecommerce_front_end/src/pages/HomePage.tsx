import { Suspense, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import '../css/App.css'
import Discount_Box from '../3d_animations/discount_box.tsx';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import Asus_Model from '../3d_animations/asus_animation.tsx';
import { OrbitControls, Stage } from '@react-three/drei'
import { NavLink } from 'react-router-dom';
import CategoryTabs from "../components/CategoryTabs.tsx"
import axios from 'axios'
import ProductCard from '../components/ProductCard.tsx'
interface Product {
    parent_asin: string;
    title: string;
    price: number | string;
    main_category: string;
    category: string;
    image_url: string; // Đổi từ product.image sang product.image_url
    store: string;
}

type SearchInputData = {
    user_id: string; // Tùy thuộc vào việc userId của bạn là chuỗi hay số
    search: string;
    category?: string;       // <-- Dấu '?' giúp thuộc tính này trở thành optional (có thể undefined)
};
function MainPage() {
    const container = useRef<HTMLDivElement | null>(null);
    const userIdRef = useRef<HTMLInputElement | null>(null);
    const searchTextRef = useRef<HTMLTextAreaElement | null>(null);
    // --- Trạng thái mảng dữ liệu rỗng (Sẵn sàng chờ Quang đổ data thật) ---
    const [products, setProducts] = useState<Product[]>([]);
    const [aiRecs, setAiRecs] = useState<Product[]>([]);
    const [modal, setModal] = useState(false);
    const [loading, setLoading] = useState<boolean>(false);
    const search = async () => {
        const inputData: SearchInputData = {
            user_id: userIdRef.current?.value || "",
            search: searchTextRef.current?.value || ""
        };
        try {
            console.log("user_id:", inputData.user_id);
            console.log("search:", inputData.search);
            setLoading(true);
            // Gọi API FastAPI (Lưu ý: Đổi https thành http nếu server FastAPI của bạn chưa cài SSL nhé!)
            const response = await axios.post('http://localhost:8000/api/v1/recommendations', inputData);

            if (response.data) {
                console.log("Dữ liệu gợi ý từ AI:", response.data);
                setProducts(response.data.products);
                setAiRecs(response.data.recommendations);
            }

        } catch (error) {
            console.error("Lỗi khi gọi API AI Recommendations:", error);
        } finally {
            setLoading(false);
        }


    }

    useGSAP(() => {
        const tl = gsap.timeline();
        tl.from(".charD", { x: 100, opacity: 0, duration: 0.1 })
            .from(".charE1", { y: -100, opacity: 0, duration: 0.1 })
            .from(".charF", { x: 100, opacity: 0, duration: 0.1 })
            .from(".charI", { y: -100, opacity: 0, duration: 0.1 })
            .from(".charN", { x: -100, opacity: 0, duration: 0.1 })
            .from(".charE2", { y: 100, opacity: 0, duration: 0.1 })
            .from(".charY1", { x: -100, opacity: 0, duration: 0.1 })
            .from(".charO", { y: 100, opacity: 0, duration: 0.1 })
            .from(".charU", { x: -100, opacity: 0, duration: 0.1 })
            .from(".charR", { y: 100, opacity: 0, duration: 0.1 })
            .from(".charS", { x: -100, opacity: 0, duration: 0.1 })
            .from(".charT", { y: 100, opacity: 0, duration: 0.1 })
            .from(".charY2", { x: -100, opacity: 0, duration: 0.1 })
            .from(".charL", { y: 100, opacity: 0, duration: 0.1 })
            .from(".charE3", { x: 100, opacity: 0, duration: 0.1 })
    }, { scope: container });

    return (
        <div style={{ backgroundColor: '#f8f9fa', color: '#212529', minHeight: '100vh', fontFamily: 'sans-serif' }}>

            {/* 1. NAVBAR (Tông màu sáng) */}
            <div className="navbar" style={{ backgroundColor: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className='logo' style={{ color: '#0d6efd', fontWeight: 'bold', fontSize: '20px' }}>TechStore</div>
                <div className='navheader' style={{ display: 'flex', gap: '20px' }}>
                    <div>
                        <NavLink to="/" style={{ color: '#495057', textDecoration: 'none' }}>Home</NavLink>
                        <NavLink to="/products" style={{ color: '#495057', textDecoration: 'none' }}>Products</NavLink>
                        <NavLink to="/specifications" style={{ color: '#495057', textDecoration: 'none' }}>Specifications</NavLink>
                        <NavLink to="/contact" style={{ color: '#495057', textDecoration: 'none' }}>About Us</NavLink>
                    </div>

                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button style={{
                        backgroundColor: 'transparent',
                        color: '#0d6efd',
                        border: '1px solid #0d6efd',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}>
                        Login
                    </button>

                    <button style={{
                        backgroundColor: '#0d6efd',
                        color: '#ffffff',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}>
                        Sign Up
                    </button>
                    {/* // bottom sign up button */}
                </div>

            </div>

            {/* 2. HERO BAR (Giữ nguyên 3D Laptop của em) */}
            <div className='herobar' style={{ display: 'flex', alignItems: 'center', padding: '20px' }}>
                <div ref={container} className='herotext' style={{ flex: 1 }}>
                    <div className="style-text">
                        <div className='char' style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                            <span className="charD">D</span><span className="charE1">E</span>
                            <span className="charF">F</span><span className="charI">I</span>
                            <span className="charN">N</span><span className="charE2">E</span>
                        </div>
                        <div className='char' style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                            <span className="charY1">Y</span><span className="charO">O</span>
                            <span className="charU">U</span><span className="charR">R</span>&nbsp;
                            <span className="charS">S</span><span className="charT">T</span>
                            <span className="charY2">Y</span><span className="charL">L</span>
                            <span className="charE3">E</span>
                        </div>
                    </div>
                </div>

                <div className="canvas-container" style={{ width: '50%', height: '50vh', paddingTop: '20px' }}>
                    <Canvas camera={{ position: [5, 1, 5], fov: 20 }}>
                        <Suspense fallback={null}>
                            <Stage environment="city" intensity={0.6}>
                                <Asus_Model />
                            </Stage>
                        </Suspense>
                        <OrbitControls makeDefault />
                    </Canvas>
                </div>
            </div>

            <div style={{ display: modal ? 'none' : 'flex', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999, justifyContent: 'center', alignItems: 'center' }}>

                <div className="modal-backdrop" onClick={() => setModal(true)} style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)' }}></div>

                <div className="modal-box" style={{ position: 'relative', background: '#ffffff', padding: '25px', borderRadius: '8px', maxWidth: '480px', width: '90%', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10 }}>

                    <span className="modal-close-x" onClick={() => setModal(true)} style={{ position: 'absolute', top: '15px', right: '20px', fontSize: '24px', cursor: 'pointer', color: '#aaa' }}>&times;</span>

                    <div className="modal-header" style={{ marginBottom: '15px', borderBottom: '1px solid #e9ecef', paddingBottom: '10px' }}>
                        <h3 style={{ margin: 0, color: '#0d6efd', display: 'flex', alignItems: 'center', gap: '8px' }}>🤖 AI Recommendation</h3>
                    </div>

                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                        <div style={{ textAlign: 'left' }}>
                            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', color: '#333' }}>
                                User ID:
                            </label>
                            <input
                                type="text"
                                ref={userIdRef}
                                placeholder="Nhập mã định danh ví dụ: user_01"
                                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ textAlign: 'left' }}>
                            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', color: '#333' }}>
                                Search Description (Search Text):
                            </label>
                            <textarea
                                ref={searchTextRef}
                                placeholder="which product you are searching ? configuration?"
                                style={{ width: '100%', height: '100px', padding: '10px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'sans-serif', resize: 'none' }}
                            ></textarea>
                        </div>

                    </div>

                    <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e9ecef', paddingTop: '15px' }}>
                        <button
                            className="btn-secondary"
                            disabled={loading}
                            onClick={() => setModal(true)}
                            style={{ padding: '8px 16px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            close
                        </button>
                        <button
                            id="closeModalBtn"
                            className="btn-primary"
                            disabled={loading}
                            onClick={() => { search() }}
                            style={{ padding: '8px 20px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            search now
                        </button>
                    </div>

                </div>
            </div>

            <div className='discountbox' style={{ background: '#ffffff', height: '200px' }}>
                <Discount_Box />
            </div>
            <div className='category-section' style={{ padding: '0 20px' }}>
                <h2>Shop by Category</h2>
                <CategoryTabs />
                <div><button className='loginbutton' style={{ backgroundColor: '#0d6efd', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px' }} onClick={() => {
                    setModal(!modal)
                }}>search</button></div>
            </div>

            {/* 3. KHU VỰC HIỂN THỊ SẢN PHẨM (Bố cục chia hai khu vực sáng sủa) */}
            <div className="demo-products-container" style={{ display: 'flex', gap: '25px', padding: '20px', marginBottom: '30px', flexWrap: 'wrap', background: '#ffffff' }}>

                {/* KHU TRÁI: DÙNG VÒNG LẶP TỰ ĐỘNG IN RA 20 PRODUCT CARD CỦA SHOP */}
                <div style={{ flex: '2', minWidth: '350px', background: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ color: '#333', marginBottom: '15px' }}>Product list(Browse Shop)</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
                        {products.length > 0 ? (
                            products.map(product => (
                                <div key={product.parent_asin} style={{ background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6' }}>
                                    <img src={product.image_url} alt={product.title} style={{ width: '100%', borderRadius: '4px' }} />
                                    <h4 style={{ fontSize: '14px', margin: '10px 0 5px 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{product.title}</h4>
                                    <p style={{ fontSize: '12px', color: '#6c757d', margin: '0' }}>Brand: {product.main_category}</p>
                                    <p style={{ fontSize: '15px', color: '#dc3545', fontWeight: 'bold', margin: '5px 0 0 0' }}>{product.price}</p>
                                </div>
                            ))
                        ) : (
                            // VÒNG LẶP TỰ ĐỘNG TẠO ĐÚNG 20 CARD TRỐNG BẰNG CODE GỌN GÀNG
                            Array.from({ length: 20 }).map((_, index) => (
                                <div key={index} style={{ background: '#f8f9fa', padding: '20px 10px', borderRadius: '6px', border: '1px dashed #cbd5e1', textAlign: 'center', height: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <div style={{ width: '35px', height: '35px', background: '#e2e8f0', borderRadius: '4px', margin: '0 auto 8px auto' }}></div>
                                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>[ Card {index + 1} Empty ]</span>
                                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0 0' }}>Awaiting Data...</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* KHU PHẢI: DÙNG VÒNG LẶP TỰ ĐỘNG IN RA 5 PRODUCT CARD GỢI Ý CỦA AI */}
                <div style={{ flex: '1', minWidth: '300px', background: '#ffffff', padding: '20px', borderRadius: '8px', border: '2px dashed #198754', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ color: '#198754', marginBottom: '15px' }}> AI Recommendation (NCF Core Output)</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#ffffff' }}>
                        {loading ? (
                            <div className="neon-spinner-container">
                                <div className="neon-spinner"></div>
                                <p>AI Recommendation Loading...</p>
                            </div>
                        ) : (
                            aiRecs.length > 0 ? (
                                aiRecs.map(aiRec => (
                                    <div key={aiRec.parent_asin} style={{ background: '#f4fbf7', padding: '15px', borderRadius: '6px', border: '1px dashed #a3e635', textAlign: 'center' }}>
                                        <ProductCard product={aiRec} />
                                    </div>
                                ))
                            ) : (
                                <div style={{ background: '#f4fbf7', padding: '15px', borderRadius: '6px', border: '1px dashed #a3e635', textAlign: 'center' }}>
                                    <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: '500' }}>🤖 AI Recommendations Empty</span>
                                </div>
                            )
                        )}
                    </div>
                </div>

            </div>


        </div>
    )
}
export default MainPage