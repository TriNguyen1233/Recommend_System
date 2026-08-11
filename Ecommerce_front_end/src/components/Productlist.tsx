import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import axios from "axios";
import "../css/ProductList.css";
import { ProductCard } from "./ProductCard";
import type { Product } from "./ProductCard";
import toast from "react-hot-toast";
import { useCart } from "../context/CartContext";

interface ProductListProps {
  products: Product[];
  loading?: boolean;
}

const ProductList = ({ products, loading = false }: ProductListProps) => {
  const listRef = useRef<HTMLDivElement | null>(null);
  // State quản lý trạng thái loading riêng cho từng sản phẩm đang bấm nút thêm vào giỏ
  const [addingAsin, setAddingAsin] = useState<string | null>(null);
  const { cartItemCount, setCartItemCount } = useCart();


  // Animation hiệu ứng hiển thị với GSAP
  useGSAP(
    () => {
      if (!loading && products && products.length > 0) {
        gsap.set(".product-card-wrapper", { opacity: 0, y: 30, scale: 0.95 });

        gsap.to(".product-card-wrapper", {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.4,
          stagger: 0.04,
          ease: "power2.out",
          clearProps: "transform,opacity,scale",
          force3D: true,
        });
      } else if (!loading && products && products.length === 0) {
        gsap.fromTo(
          ".no-products-container",
          { opacity: 0, scale: 0.9 },
          { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.7)" }
        );
      }
    },
    { scope: listRef, dependencies: [products, loading] }
  );

  // Xử lý thêm sản phẩm vào giỏ hàng
  const handleAddToCart = async (product: Product, quantity = 1) => {
    if (!product) return;

    let userId = "";
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        userId = parsedUser?.id || "";
      }
    } catch (e) {
      console.error("Error parsing user object from localStorage:", e);
    }

    const token = localStorage.getItem("jwtToken");

    if (!userId) {
      toast.error("User ID is missing. Please log in again.", {
        duration: 2000,
      });
      return;
    }

    const itemAsin = product.parent_asin || product.asin;
    setAddingAsin(itemAsin || null);

    try {
      const response = await axios.post(
        "http://localhost:8080/api/cart/add",
        null,
        {
          params: {
            userId: userId,
            asin: itemAsin,
            quantity: quantity,
          },
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        }
      );

      if (response.status === 200) {
        setCartItemCount(prev => prev + quantity);

        toast.success(`Added ${quantity} item(s) to cart successfully!`, {
          duration: 2000, // 2 giây
        });
      }
    } catch (error) {
      toast.error(`Failed to add product to cart: ${error}`, {
        duration: 2000,
      });
      toast.error("Failed to add product to cart. Please try again.", {
        duration: 2000,
      });
    } finally {
      setAddingAsin(null);
    }
  };

  // Skeleton UI khi đang tải dữ liệu
  if (loading) {
    return (
      <div className="product-list-container">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="light-skeleton-card">
            <div className="skeleton-img"></div>
            <div className="skeleton-line short"></div>
            <div className="skeleton-line long"></div>
            <div className="skeleton-line price"></div>
          </div>
        ))}
      </div>
    );
  }

  // Giao diện chính hiển thị danh sách sản phẩm
  return (
    <div className="product-list-container" ref={listRef}>
      {products && products.length > 0 ? (
        products.map((product, index) => {
          const currentAsin = product.asin || product.asin || String(index);
          return (
            <div key={currentAsin} className="product-card-wrapper">
              <ProductCard
                product={product}
                onAddToCart={(qty) => handleAddToCart(product, qty)}
                isAdding={addingAsin === currentAsin}
              />
            </div>
          );
        })
      ) : (
        <div className="no-products-container">
          <p>No products found.</p>
        </div>
      )}
    </div>
  );
};

export default ProductList;