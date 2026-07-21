import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header'; // Bạn hãy chỉnh lại đường dẫn import Header cho đúng với dự án
import '../css/NotFoundPage.css'; // File CSS định dạng riêng cho trang này

const NotFoundPage = () => {
    return (
        <div className="not-found-page">
            <Header />
            
            <div className="not-found-container">
                <div className="not-found-content">
                    <h1 className="not-found-code">404</h1>
                    
                    <h2 className="not-found-title">Oops! Page Not Found</h2>
                    
                    <p className="not-found-text">
                        The page you are looking for might have been removed, 
                        had its name changed, or is temporarily unavailable.
                    </p>
                    
                    <Link to="/" className="not-found-btn">
                        Back to Homepage
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;