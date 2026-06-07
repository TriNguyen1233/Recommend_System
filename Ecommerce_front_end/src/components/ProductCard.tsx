interface Product {
  parent_asin: string;
  title: string;
  price: number | string;
  main_category: string;
  category: string;
  image_url: string; // Đổi từ product.image sang product.image_url
  store: string;
}
function ProductCard({ product }: { product: Product }) {
    return (
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', textAlign: 'center', background: '#fff' }}>
            <img src={product.image_url} alt={product.title} style={{ width: '100%', height: '150px', objectFit: 'contain', marginBottom: '10px' }} />
            <h3 style={{ fontSize: '16px', margin: '10px 0' }}>{product.title}</h3>
            <p style={{ fontSize: '14px', color: '#555' }}>${product.price}</p>
        </div>
    );
}
export default ProductCard;