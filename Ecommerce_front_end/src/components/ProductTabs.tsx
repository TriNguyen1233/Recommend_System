function ProductTabs({ products }) {
    return (
        <div className="product-tabs">
            {products.map((product) => (
                <div className="product-tab" key={product.id}>
                    <img src={product.image} alt={product.name} className="product-image" />
                    <div className="product-info">
                        <h3>{product.name}</h3>
                        <p>${product.price.toFixed(2)}</p>
                    </div>
                </div>
            ))}
        </div>
    )
}
export default ProductTabs;
