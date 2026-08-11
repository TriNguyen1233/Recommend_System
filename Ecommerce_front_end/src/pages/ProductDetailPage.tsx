import { Suspense, useEffect, useRef, useState } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import Header from '../components/Header.tsx';
import Asus_Model from '../3d_animations/asus_animation.tsx';
import '../css/App.css';
import Editor from '../components/Editor.tsx';
import axios from 'axios';
import { $getRoot } from 'lexical';
import Swal from 'sweetalert2';

interface Product {
    parent_asin: string;
    title: string;
    price: number | string;
    main_category: string;
    category: string;
    image: string;
    store: string;
    description?: string | Record<string, any>;
    specs?: { [key: string]: string };
}

interface Comment {
    id: number;
    rating: number;
    content: string;
    userName?: string;
    userId?: string;
    productAsin?: string;
}

const parseDescription = (desc: string | Record<string, any> | undefined): Record<string, any> => {
    if (!desc) return {};
    if (typeof desc === 'object') return desc;

    try {
        const normalizedJson = desc.replace(/'/g, '"');
        return JSON.parse(normalizedJson);
    } catch (e) {
        return { Description: desc };
    }
};

function ProductDetailPage() {
    const { id } = useParams<{ id: string }>();
    const detailsRef = useRef<HTMLDivElement | null>(null);
    const [rating, setRating] = useState<number>(0);
    const [quantity, setQuantity] = useState<number>(1);
    const [viewMode, setViewMode] = useState<'3d' | 'image'>('3d');
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isAdding, setIsAdding] = useState<boolean>(false);
    const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
    const [commentContent, setCommentContent] = useState<string>('');
    const [commentsList, setCommentsList] = useState<Comment[]>([]);

    // STATE CHO TÍNH NĂNG CHỈNH SỬA REVIEW
    const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
    const [editRating, setEditRating] = useState<number>(0);
    const [editContent, setEditContent] = useState<string>('');

    // HÀM LẤY USER ID HIỆN TẠI TỪ LOCALSTORAGE
    const getCurrentUserId = (): string => {
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                return parsedUser?.id || parsedUser?.userId || '';
            }
        } catch (e) {
            console.error('Error parsing user object from localStorage:', e);
        }
        return '';
    };

    // 🌟 HÀM LẤY TÊN USER HIỆN TẠI TỪ LOCALSTORAGE
    const getCurrentUserName = (): string => {
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                return parsedUser?.fullName || parsedUser?.userName || parsedUser?.name || parsedUser?.email || '';
            }
        } catch (e) {
            console.error('Error parsing user name from localStorage:', e);
        }
        return '';
    };

    const currentUserId = getCurrentUserId();
    const currentUserName = getCurrentUserName();

    // 1. Fetch chi tiết sản phẩm và Danh sách Reviews
    useEffect(() => {
        const fetchProductAndReviews = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("jwtToken");
                const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

                // Lấy thông tin sản phẩm
                const productRes = await axios.get(`http://localhost:8080/api/products/${id}`, {
                    headers: authHeader
                });

                if (productRes.data) {
                    setProduct(productRes.data);
                    const asin = productRes.data.parent_asin || id;

                    // Lấy danh sách reviews theo ASIN sản phẩm
                    try {
                        const reviewsRes = await axios.get(`http://localhost:8080/api/reviews/product/${asin}`, {
                            headers: authHeader
                        });
                        if (reviewsRes.data) {
                            setCommentsList(reviewsRes.data);
                        }
                    } catch (revErr) {
                        console.error("Fetch reviews error:", revErr);
                    }
                }
            } catch (error) {
                console.error("Fetch product error:", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchProductAndReviews();
        }
    }, [id]);

    // GSAP Animation
    useGSAP(() => {
        if (!loading && product) {
            gsap.fromTo(".product-animate",
                { y: 30, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.6,
                    stagger: 0.1,
                    ease: "power2.out",
                    clearProps: "opacity,transform"
                }
            );
        }
    }, { scope: detailsRef, dependencies: [loading, product] });

    // Handle Add to Cart
    const handleAddToCart = async () => {
        if (!product) return;

        if (!currentUserId) {
            Swal.fire({
                icon: 'warning',
                title: 'Authentication Required',
                text: 'User ID is missing. Please log in again.',
                confirmButtonColor: '#0d6efd'
            });
            return;
        }

        const token = localStorage.getItem('jwtToken');
        setIsAdding(true);

        try {
            const response = await axios.post(
                'http://localhost:8080/api/cart/add',
                null,
                {
                    params: {
                        userId: currentUserId,
                        asin: product.parent_asin || id,
                        quantity: quantity
                    },
                    headers: {
                        Authorization: token ? `Bearer ${token}` : ''
                    }
                }
            );

            if (response.status === 200) {
                Swal.fire({
                    icon: 'success',
                    title: 'Added to Cart!',
                    text: `Added ${quantity} item(s) to cart successfully!`,
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        } catch (error) {
            console.error('Failed to add product to cart:', error);
            Swal.fire({
                icon: 'error',
                title: 'Cart Error',
                text: 'Failed to add product to cart. Please try again.'
            });
        } finally {
            setIsAdding(false);
        }
    };

    // 2. Handle Submit Review (POST /api/reviews)
    const handleSubmitComment = async () => {
        if (rating === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Rating Required',
                text: 'Please select a star rating before submitting!'
            });
            return;
        }

        if (!commentContent.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Content Required',
                text: 'Please write some content for your review!'
            });
            return;
        }

        if (!currentUserId) {
            Swal.fire({
                icon: 'warning',
                title: 'Authentication Required',
                text: 'User ID is missing. Please log in to submit a review.'
            });
            return;
        }

        const token = localStorage.getItem('jwtToken');

        const reviewData = {
            productAsin: product?.parent_asin || id,
            userId: currentUserId,
            rating: rating,
            content: commentContent
        };

        setIsSubmittingReview(true);
        try {
            const response = await axios.post(
                'http://localhost:8080/api/reviews',
                reviewData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: token ? `Bearer ${token}` : ''
                    }
                }
            );

            if (response.status === 201 || response.status === 200) {
                Swal.fire({
                    icon: 'success',
                    title: 'Thank You!',
                    text: 'Thank you for sharing your review!',
                    timer: 2000,
                    showConfirmButton: false
                });

                // 🌟 FIX: Đảm bảo gán tên người dùng từ LocalStorage nếu backend chưa trả về
                const newComment: Comment = {
                    ...response.data,
                    userName: response.data?.userName || currentUserName || 'User'
                };

                setCommentsList([newComment, ...commentsList]);
                setCommentContent('');
                setRating(0);
            }
        } catch (error) {
            console.error('Failed to submit review:', error);
            Swal.fire({
                icon: 'error',
                title: 'Submission Failed',
                text: 'Failed to submit review. Please try again.'
            });
        } finally {
            setIsSubmittingReview(false);
        }
    };

    // 3. Handle Delete Review (DELETE /api/reviews/{id})
    const handleDeleteComment = async (commentId: number) => {
        const confirmResult = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this review!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, delete it!'
        });

        if (!confirmResult.isConfirmed) return;

        const token = localStorage.getItem('jwtToken');
        try {
            await axios.delete(`http://localhost:8080/api/reviews/${commentId}`, {
                headers: {
                    Authorization: token ? `Bearer ${token}` : ''
                }
            });

            Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'Review deleted successfully!',
                timer: 2000,
                showConfirmButton: false
            });
            setCommentsList(prev => prev.filter(item => item.id !== commentId));
        } catch (error) {
            console.error("Failed to delete review:", error);
            Swal.fire({
                icon: 'error',
                title: 'Delete Failed',
                text: 'Failed to delete review. Please try again.'
            });
        }
    };

    // 4. Handle Start Editing
    const handleStartEdit = (comment: Comment) => {
        setEditingCommentId(comment.id);
        setEditRating(comment.rating);
        setEditContent(comment.content);
    };

    // 5. Handle Cancel Edit
    const handleCancelEdit = () => {
        setEditingCommentId(null);
        setEditRating(0);
        setEditContent('');
    };

    // 6. Handle Save Edit (PUT /api/reviews/{id})
    const handleSaveEdit = async (commentId: number) => {
        if (editRating === 0 || !editContent.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Incomplete Field',
                text: 'Please provide both rating and content!'
            });
            return;
        }

        const token = localStorage.getItem('jwtToken');
        try {
            const response = await axios.put(
                `http://localhost:8080/api/reviews/${commentId}`,
                {
                    rating: editRating,
                    content: editContent
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: token ? `Bearer ${token}` : ''
                    }
                }
            );

            Swal.fire({
                icon: 'success',
                title: 'Updated!',
                text: 'Review updated successfully!',
                timer: 2000,
                showConfirmButton: false
            });

            setCommentsList(prev =>
                prev.map(item =>
                    item.id === commentId
                        ? { ...item, rating: editRating, content: editContent, ...(response.data || {}) }
                        : item
                )
            );

            handleCancelEdit();
        } catch (error) {
            console.error("Failed to update review:", error);
            Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: 'Failed to update review. Please try again.'
            });
        }
    };

    if (loading) {
        return (
            <div style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
                <Header />
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', fontSize: '18px', fontWeight: 'bold', color: '#555' }}>
                    🔄 Loading product details...
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
                <Header />
                <div style={{ textAlign: 'center', padding: '100px 20px', fontSize: '18px', color: '#dc3545' }}>
                    ❌ Product not found or failed to load.
                </div>
            </div>
        );
    }

    const descriptionMap = parseDescription(product.description);

    return (
        <div style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
            <Header />

            <div style={{ padding: '15px 50px', background: '#f8f9fa', borderBottom: '1px solid #e9ecef', fontSize: '14px', color: '#6c757d' }}>
                <NavLink to="/" style={{ color: '#0d6efd', textDecoration: 'none' }}>Home</NavLink> /
                <span style={{ margin: '0 8px' }}>{product.category}</span> /
                <strong style={{ color: '#333' }}> {product.title}</strong>
            </div>

            <div ref={detailsRef} style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '40px' }}>

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
                                    src={product.image}
                                    alt={product.title}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '20px' }}
                                />
                            )}

                            {viewMode === '3d' && (
                                <span style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '12px', padding: '4px 10px', borderRadius: '4px' }}>
                                    🖱️ Drag to rotate 3D view
                                </span>
                            )}
                        </div>

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

                    <div>
                        <span className="product-animate" style={{ fontSize: '13px', color: '#0d6efd', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {product.store}
                        </span>
                        <h1 className="product-animate" style={{ fontSize: '28px', fontWeight: 'bold', color: '#111111', margin: '10px 0 15px 0', lineHeight: '1.3' }}>
                            {product.title}
                        </h1>

                        <div className="product-animate" style={{ fontSize: '32px', fontWeight: '800', color: '#0d6efd', marginBottom: '20px' }}>
                            ${product.price}
                        </div>

                        <div className="product-animate" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
                            <label style={{ fontWeight: 'bold', fontSize: '15px', color: '#333' }}>Quantity:</label>
                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ced4da', borderRadius: '6px', overflow: 'hidden' }}>
                                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ padding: '8px 16px', background: '#f8f9fa', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                                <span style={{ padding: '8px 20px', fontSize: '15px', fontWeight: 'bold', color: '#111' }}>{quantity}</span>
                                <button onClick={() => setQuantity(quantity + 1)} style={{ padding: '8px 16px', background: '#f8f9fa', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                            </div>
                        </div>

                        <div className="product-animate" style={{ display: 'flex', gap: '15px' }}>
                            <button
                                onClick={handleAddToCart}
                                disabled={isAdding}
                                style={{
                                    flex: '1',
                                    padding: '14px',
                                    backgroundColor: isAdding ? '#e0e0e0' : '#e7f1ff',
                                    color: '#0d6efd',
                                    border: '1px solid #0d6efd',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    fontSize: '15px',
                                    cursor: isAdding ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isAdding ? '⏳ Adding...' : '🛒 Add to Cart'}
                            </button>
                            <button style={{ flex: '1', padding: '14px', backgroundColor: '#0d6efd', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
                                ⚡ Buy Now
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '50px', background: '#ffffff', padding: '30px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                    <h3 style={{ borderBottom: '2px solid #0d6efd', paddingBottom: '10px', margin: '0 0 20px 0', color: '#333', display: 'inline-block', fontSize: '20px' }}>
                        Technical Specifications
                    </h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
                        <tbody>
                            {Object.keys(descriptionMap).length > 0 ? (
                                Object.entries(descriptionMap).map(([key, val], idx) => (
                                    <tr key={key} style={{ backgroundColor: idx % 2 === 0 ? '#f8f9fa' : '#ffffff' }}>
                                        <td style={{ padding: '14px', fontWeight: 'bold', color: '#555', width: '30%', borderBottom: '1px solid #eee' }}>{key}</td>
                                        <td style={{ padding: '14px', color: '#333', borderBottom: '1px solid #eee' }}>
                                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={2} style={{ padding: '14px', color: '#888' }}>No specifications available.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Reviews Section */}
                <div style={{ marginTop: '50px', background: '#ffffff', padding: '30px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                    <h3 style={{ borderBottom: '2px solid #0d6efd', paddingBottom: '10px', margin: '0 0 25px 0', color: '#333', display: 'inline-block', fontSize: '20px' }}>
                        Customer Reviews & Ratings ({commentsList.length})
                    </h3>

                    {/* Review Form */}
                    <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #e9ecef' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#333' }}>Write a Review</h4>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#555' }}>Your Rating:</span>
                            <div>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', padding: '0 2px', color: star <= rating ? '#f59e0b' : '#ccc' }}
                                        onClick={() => setRating(star)}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <Editor onChange={(editorState) => {
                                editorState.read(() => {
                                    const root = $getRoot();
                                    const textContent = root.getTextContent();
                                    setCommentContent(textContent);
                                });
                            }} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={handleSubmitComment}
                                disabled={isSubmittingReview}
                                style={{
                                    padding: '10px 24px',
                                    backgroundColor: isSubmittingReview ? '#6c757d' : '#0d6efd',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    fontSize: '14px',
                                    cursor: isSubmittingReview ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 2px 4px rgba(13, 110, 253, 0.2)'
                                }}
                            >
                                {isSubmittingReview ? '⏳ Submitting...' : '💬 Submit Review'}
                            </button>
                        </div>
                    </div>

                    {/* Published Comments List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {commentsList.length > 0 ? (
                            commentsList.map((comment) => {
                                const isOwner = String(comment.userId) === String(currentUserId);
                                const isEditing = editingCommentId === comment.id;

                                return (
                                    <div key={comment.id} style={{ padding: '16px', borderBottom: '1px solid #eee', background: isEditing ? '#f8f9fa' : 'transparent', borderRadius: '8px' }}>
                                        {isEditing ? (
                                            /* KHUNG CHỈNH SỬA REVIEW */
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Rating:</span>
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <button
                                                            key={star}
                                                            type="button"
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: star <= editRating ? '#f59e0b' : '#ccc' }}
                                                            onClick={() => setEditRating(star)}
                                                        >
                                                            ★
                                                        </button>
                                                    ))}
                                                </div>
                                                <textarea
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    rows={3}
                                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '14px', boxSizing: 'border-box' }}
                                                />
                                                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        style={{ padding: '6px 14px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => handleSaveEdit(comment.id)}
                                                        style={{ padding: '6px 14px', background: '#198754', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                                                    >
                                                        Save Changes
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* KHUNG HIỂN THỊ REVIEW BÌNH THƯỜNG */
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <strong style={{ color: '#333', fontSize: '15px' }}>
                                                        {comment.userName || 'Anonymous User'}
                                                    </strong>

                                                    {isOwner && (
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button
                                                                onClick={() => handleStartEdit(comment)}
                                                                style={{ padding: '4px 8px', background: 'none', border: '1px solid #0d6efd', color: '#0d6efd', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                                                            >
                                                                ✏️ Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteComment(comment.id)}
                                                                style={{ padding: '4px 8px', background: 'none', border: '1px solid #dc3545', color: '#dc3545', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                                                            >
                                                                🗑️ Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <div style={{ color: '#f59e0b', fontSize: '16px', marginBottom: '8px' }}>
                                                    {"★".repeat(comment.rating)}{"☆".repeat(5 - comment.rating)}
                                                </div>

                                                <p style={{ margin: 0, color: '#555', fontSize: '14px', lineHeight: '1.5' }}>
                                                    {comment.content}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <p style={{ color: '#888', fontStyle: 'italic' }}>No reviews yet. Be the first to review this product!</p>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

export default ProductDetailPage;