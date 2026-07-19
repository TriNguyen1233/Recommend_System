import { useEffect, useState } from "react";
import ProductCard from "./ProductCard"
import "../css/ProductList.css"
import axios from "axios";
interface Product {
    parent_asin: string;
    title: string;
    price: number | string;
    main_category: string;
    category: string;
    image_url: string;
    store: string;
}
const ProductList = () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [products, setProducts] = useState<Product[]>([]);

    useEffect(() => {
        const getProductLimit = async () => {
            try {
                const response = await axios.get("http://localhost:8080/api/cart");
                if (response) {
                    console.log(response.data);
                    setProducts(response.data);
                }
            } catch (error) {
                console.log(error);
            }
        }
        getProductLimit();
    }, [])
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
            {products.length > 0 ? (
                products.map(product => (
                    <ProductCard
                        key={product.parent_asin}
                        product={product}
                    />
                ))
            ) : (
                <div className="neon-spinner-container">
                    <div className="neon-spinner"></div>
                    <p>Loading...</p>
                </div>
            )
            }
        </div>)


}
export default ProductList;