import { useRef, useState } from "react";
import { gsap } from "gsap";
import { Link } from "react-router-dom";

interface Product {
    asin: string;
    parent_asin?: string;
    title: string;
    price: number | string;
    main_category?: string;
    category?: string;
    image?: string;
    image_url?: string;
    store?: string;
}

interface ProductCardProps {
    product: Product;
    onAddToCart?: (quantity?: number) => void;
    isAdding?: boolean;
}

function ProductCard({ product, onAddToCart, isAdding = false }: ProductCardProps) {
    const addCartRef = useRef<HTMLDivElement | null>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);

    // State quản lý số lượng sản phẩm
    const [quantity, setQuantity] = useState<number>(1);

    // Xử lý tăng/giảm số lượng
    const handleDecrease = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (quantity > 1) {
            setQuantity((prev) => prev - 1);
        }
    };

    const handleIncrease = (e: React.MouseEvent) => {
        e.stopPropagation();
        setQuantity((prev) => prev + 1);
    };

    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        const val = parseInt(e.target.value, 10);
        if (isNaN(val) || val < 1) {
            setQuantity(1);
        } else {
            setQuantity(val);
        }
    };

    // Formatting hiển thị giá
    const displayPrice = product.price
        ? String(product.price).startsWith("$")
            ? product.price
            : `$${product.price}`
        : "Contact for price";

    // Hiệu ứng GSAP hình ảnh bay vào giỏ hàng
    const AddCartAnimation = (productImage: HTMLImageElement | null) => {
        if (!productImage) return;

        const cartElement = document.querySelector(".CartNav");
        if (!cartElement) return;

        const imageRect = productImage.getBoundingClientRect();
        const cartRect = cartElement.getBoundingClientRect();
        const imageClone = productImage.cloneNode(true) as HTMLImageElement;

        Object.assign(imageClone.style, {
            position: "fixed",
            top: `${imageRect.top}px`,
            left: `${imageRect.left}px`,
            width: `${imageRect.width}px`,
            height: `${imageRect.height}px`,
            zIndex: "9999",
            pointerEvents: "none",
        });

        document.body.appendChild(imageClone);
        const deltaX = cartRect.left - imageRect.left;
        const deltaY = cartRect.top - imageRect.top;

        gsap.fromTo(
            imageClone,
            {
                scale: 1,
                opacity: 1,
                x: 0,
                y: 0,
            },
            {
                scale: 0.1,
                opacity: 1,
                x: deltaX,
                y: deltaY,
                duration: 0.8,
                ease: "power2.inOut",
                onComplete: () => {
                    imageClone.remove();

                    // Hiệu ứng nảy biểu tượng CartNav
                    gsap.fromTo(
                        ".CartNav",
                        { scale: 0.7, transformOrigin: "center center" },
                        { scale: 1, duration: 0.3, ease: "back.out(2)" }
                    );
                },
            }
        );
    };

    // Hàm xử lý sự kiện click nút Add to Cart
    const handleCartClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isAdding) return;

        // 1. Chạy hiệu ứng GSAP bay hình
        AddCartAnimation(imgRef.current);

        // 2. Gọi API truyền số lượng đã chọn
        if (onAddToCart) {
            onAddToCart(quantity);
        }
    };

    const productAsin = product.parent_asin || product.asin;
    const productImage = product.image || product.image_url || "https://placehold.co/150?text=No+Image";

    return (
        <div
            style={{
                background: "#fff",
                padding: "15px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                textAlign: "center",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
            }}
        >
            <div>
                <Link
                    to={productAsin ? `/products/${productAsin}` : "#"}
                    style={{
                        textDecoration: "none",
                        color: "inherit",
                        display: "block",
                    }}
                >
                    <img
                        ref={imgRef}
                        src={productImage}
                        alt={product.title}
                        style={{
                            width: "100%",
                            height: "150px",
                            objectFit: "contain",
                            marginBottom: "10px",
                            borderRadius: "4px",
                        }}
                    />

                    <h3
                        style={{
                            fontSize: "15px",
                            margin: "10px 0 5px 0",
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                        }}
                        title={product.title}
                    >
                        {product.title}
                    </h3>

                    <p style={{ fontSize: "12px", color: "#6c757d", margin: "0 0 5px 0" }}>
                        Brand: {product.main_category || product.category || "Generic"}
                    </p>
                </Link>

                <div style={{ fontSize: "16px", color: "#dc3545", fontWeight: "bold", margin: "8px 0" }}>
                    {displayPrice}
                </div>
            </div>

            {/* THANH THAO TÁC: BỘ CHỌN SỐ LƯỢNG + NÚT ADD TO CART */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    marginTop: "10px",
                    gap: "8px",
                }}
            >
                {/* Bộ chỉnh số lượng (Quantity Selector) */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        border: "1px solid #ced4da",
                        borderRadius: "20px",
                        overflow: "hidden",
                        height: "36px",
                    }}
                >
                    <button
                        type="button"
                        onClick={handleDecrease}
                        disabled={quantity <= 1 || isAdding}
                        style={{
                            width: "28px",
                            height: "100%",
                            border: "none",
                            background: "#f8f9fa",
                            cursor: quantity <= 1 || isAdding ? "not-allowed" : "pointer",
                            fontWeight: "bold",
                            color: "#495057",
                        }}
                    >
                        -
                    </button>
                    <input
                        type="number"
                        value={quantity}
                        onChange={handleQuantityChange}
                        disabled={isAdding}
                        style={{
                            width: "34px",
                            height: "100%",
                            border: "none",
                            textAlign: "center",
                            fontSize: "13px",
                            fontWeight: "bold",
                            color: "#212529",
                            outline: "none",
                            MozAppearance: "textfield",
                        }}
                    />
                    <button
                        type="button"
                        onClick={handleIncrease}
                        disabled={isAdding}
                        style={{
                            width: "28px",
                            height: "100%",
                            border: "none",
                            background: "#f8f9fa",
                            cursor: isAdding ? "not-allowed" : "pointer",
                            fontWeight: "bold",
                            color: "#495057",
                        }}
                    >
                        +
                    </button>
                </div>

                {/* Nút bấm Add To Cart */}
                <div
                    ref={addCartRef}
                    style={{
                        backgroundColor: isAdding ? "#6c757d" : "#212529",
                        width: "40px",
                        height: "40px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "30px",
                        cursor: isAdding ? "not-allowed" : "pointer",
                        position: "relative",
                        zIndex: 10,
                        transition: "background-color 0.2s ease",
                        flexShrink: 0,
                    }}
                    onClick={handleCartClick}
                    title="Add to Cart"
                >
                    {isAdding ? (
                        <div
                            style={{
                                width: "16px",
                                height: "16px",
                                border: "2px solid #ffffff",
                                borderTop: "2px solid transparent",
                                borderRadius: "50%",
                                animation: "spin 0.8s linear infinite",
                            }}
                        />
                    ) : (
                        <svg
                            style={{ width: "20px", height: "20px", fill: "white" }}
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 640 640"
                        >
                            <path d="M0 72C0 58.7 10.7 48 24 48L69.3 48C96.4 48 119.6 67.4 124.4 94L124.8 96L312 96L312 198.1L281 167.1C271.6 157.7 256.4 157.7 247.1 167.1C237.8 176.5 237.7 191.7 247.1 201L319.1 273C328.5 282.4 343.7 282.4 353 273L425 201C434.4 191.6 434.4 176.4 425 167.1C415.6 157.8 400.4 157.7 391.1 167.1L360.1 198.1L360.1 96L537.5 96C557.5 96 572.6 114.2 568.9 133.9L537.8 299.8C532.1 330.1 505.7 352 474.9 352L171.3 352L176.4 380.3C178.5 391.7 188.4 400 200 400L456 400C469.3 400 480 410.7 480 424C480 437.3 469.3 448 456 448L200.1 448C165.3 448 135.5 423.1 129.3 388.9L77.2 102.6C76.5 98.8 73.2 96 69.3 96L24 96C10.7 96 0 85.3 0 72zM160 528C160 501.5 181.5 480 208 480C234.5 480 256 501.5 256 528C256 554.5 234.5 576 208 576C181.5 576 160 554.5 160 528zM384 528C384 501.5 405.5 480 432 480C458.5 480 480 501.5 480 528C480 554.5 458.5 576 432 576C405.5 576 384 554.5 384 528z" />
                        </svg>
                    )}
                </div>
            </div>
        </div>
    );
}

export { ProductCard };
export type { Product, ProductCardProps };