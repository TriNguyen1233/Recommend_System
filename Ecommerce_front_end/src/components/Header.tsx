import { NavLink } from "react-router-dom"

const Header = () => {
    return (
        <div style={{ position: "sticky", top: 0, zIndex: "10", height: "70px" }}>
            {/* 1. NAVBAR (Tông màu sáng) */}
            <div className="navbar" style={{ height: "100%", backgroundColor: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className='logo' style={{ color: '#0d6efd', fontWeight: 'bold', fontSize: '20px' }}>TechStore</div>
                <div className='navheader' style={{ display: 'flex', gap: '20px'}}>
                    <div style={{ display: "flex", gap: "20px", width: "500px", margin: 'auto' }}>
                        <NavLink to="/homepage" style={{ color: '#495057', textDecoration: 'none' }}>Home</NavLink>
                        <NavLink to="/products" style={{ color: '#495057', textDecoration: 'none' }}>Products</NavLink>
                        <NavLink to="/specifications" style={{ color: '#495057', textDecoration: 'none' }}>Specifications</NavLink>
                        <NavLink to="/contact" style={{ color: '#495057', textDecoration: 'none' }}>About Us</NavLink>
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {/* KHU VỰC GIỎ HÀNG */}
                    {/* Bỏ class CartNav ở đây để tránh bị lệch tọa độ do marginRight */}
                    <div style={{ marginRight: "50px", width: "50px", height: "50px", position: "relative" }}>
                        
                        {/* Số lượng thông báo trên giỏ hàng */}
                        <div style={{
                            position: "absolute", 
                            zIndex: 2, // Tăng zIndex lên để luôn nằm trên cùng
                            background: "red", 
                            color: "white", 
                            fontSize: "11px",
                            fontWeight: "bold",
                            display: "flex", // Dùng flex để căn giữa số 10 tròn trịa
                            alignItems: "center",
                            justifyContent: "center",
                            width: "20px", 
                            height: "20px", 
                            borderRadius: "50%", 
                            top: "-5px", 
                            right: "-5px" // Căn lại góc phải
                        }}>
                            10
                        </div>
                        
                        {/* 🎯 SỬA TẠI ĐÂY: Gắn class CartNav TRỰC TIẾP vào thẻ SVG chiếc xe đẩy này */}
                        <svg 
                            className="CartNav" 
                            style={{ 
                                fill: "black", 
                                width: "35px", 
                                height: "35px", 
                                position: "absolute", 
                                bottom: "5px",
                                right: "5px",
                                cursor: "pointer"
                            }} 
                            xmlns="http://www.w3.org/2000/svg" 
                            viewBox="0 0 640 640"
                        >
                            <path d="M24 48C10.7 48 0 58.7 0 72C0 85.3 10.7 96 24 96L69.3 96C73.2 96 76.5 98.8 77.2 102.6L129.3 388.9C135.5 423.1 165.3 448 200.1 448L456 448C469.3 448 480 437.3 480 424C480 410.7 469.3 400 456 400L200.1 400C188.5 400 178.6 391.7 176.5 380.3L171.4 352L475 352C505.8 352 532.2 330.1 537.9 299.8L568.9 133.9C572.6 114.2 557.5 96 537.4 96L124.7 96L124.3 94C119.5 67.4 96.3 48 69.2 48L24 48zM208 576C234.5 576 256 554.5 256 528C256 501.5 234.5 480 208 480C181.5 480 160 501.5 160 528C160 554.5 181.5 576 208 576zM432 576C458.5 576 480 554.5 480 528C480 501.5 458.5 480 432 480C405.5 480 384 501.5 384 528C384 554.5 405.5 576 432 576z" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    )
}
export default Header;