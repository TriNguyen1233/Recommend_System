# Hướng Dẫn Chạy Dự Án: E-Commerce Recommendation System

Tài liệu này hướng dẫn bạn cài đặt các điều kiện tiên quyết và khởi chạy toàn bộ các thành phần trong dự án (Frontend, Backend, AI Subsystem) theo đúng thứ tự để hệ thống vận hành mượt mà.

---

## 📌 0. Các Điều Kiện Tiên Quyết (Prerequisites)

Trước khi chạy dự án, hãy đảm bảo máy tính của bạn đã được cài đặt và đang chạy các dịch vụ sau:

1. **Java 21 JDK**: Sử dụng cho Spring Boot Backend.
2. **Node.js (phiên bản v18+)**: Sử dụng cho React/Vite Frontend.
3. **Python (phiên bản 3.10+)**: Sử dụng cho AI Recommender Subsystem.
4. **Ollama**:
   * Tải và cài đặt tại [ollama.com](https://ollama.com).
   * Mở ứng dụng Ollama (hoặc chạy lệnh `ollama serve` trong Terminal).
   * Tải model embedding bằng lệnh:
     ```bash
     ollama pull nomic-embed-text
     ```
5. **PostgreSQL**:
   * Khởi chạy PostgreSQL Server (mặc định cổng `5432`).
   * Tạo 2 cơ sở dữ liệu (Database) trống:
     * `Recommend_DB` (Dành cho Spring Boot).
     * `CFRSystem` (Dành cho AI Recommend System).
   * Kích hoạt tiện ích mở rộng **pgvector** trên cơ sở dữ liệu `CFRSystem` bằng cách mở SQL Query Tool trên DB này và chạy:
     ```sql
     CREATE EXTENSION IF NOT EXISTS vector;
     ```

---

## 🚀 Thứ Tự Khởi Chạy Hệ Thống

Hãy thực hiện khởi chạy các thành phần theo thứ tự dưới đây:

### ➡️ Bước 1: Khởi chạy AI Recommendation Subsystem (FastAPI)
Thành phần này chịu trách nhiệm xử lý các tác vụ AI và tìm kiếm vector tương tự.

1. Mở Terminal mới (Terminal 1) và di chuyển vào thư mục AI:
   ```bash
   cd Ecommerce_Recommend_System
   ```
2. Cài đặt các thư viện Python cần thiết:
   ```bash
   pip install fastapi uvicorn torch torch_geometric psycopg pandas joblib scikit-learn pydantic python-dotenv ollama
   ```
3. Tạo file cấu hình môi trường `.env` trong thư mục `Ecommerce_Recommend_System` (nếu chưa có) với nội dung:
   ```env
   DB_NAME=CFRSystem
   DB_USER=postgres
   DB_PASSWORD=12332100  # Thay bằng mật khẩu PostgreSQL của bạn
   DB_HOST=localhost
   DB_PORT=5432
   ```
4. *(Tùy chọn - Chỉ chạy lần đầu)* Nạp dữ liệu sản phẩm và tạo vector embeddings vào cơ sở dữ liệu:
   ```bash
   python Vector_DB/pg_connector.py
   ```
5. Khởi chạy FastAPI Server:
   ```bash
   python Controller/api.py
   ```
   *Dịch vụ AI sẽ chạy trên địa chỉ: `http://127.0.0.1:8000`.*

---

### ➡️ Bước 2: Khởi chạy Backend Services (Spring Boot)
Thành phần này quản lý giỏ hàng, người dùng, sản phẩm, và các nghiệp vụ thương mại điện tử.

1. Mở một Terminal mới (Terminal 2) và di chuyển vào thư mục Backend:
   ```bash
   cd Ecommerce_back_end
   ```
2. Đảm bảo cấu hình kết nối database trong file `src/main/resources/application.properties` là chính xác:
   ```properties
   spring.datasource.url=jdbc:postgresql://localhost:5432/Recommend_DB
   spring.datasource.username=postgres
   spring.datasource.password=123456  # Thay bằng mật khẩu PostgreSQL của bạn
   ```
3. Chạy lệnh Maven để khởi động Backend:
   * **Trên Windows**:
     ```powershell
     .\mvnw.cmd spring-boot:run
     ```
   * **Trên macOS / Linux**:
     ```bash
     ./mvnw spring-boot:run
     ```
   *Backend sẽ khởi chạy trên địa chỉ: `http://localhost:8080` (Tài liệu API Swagger tại `http://localhost:8080/swagger-ui.html`).*

---

### ➡️ Bước 3: Khởi chạy Client Interface (React/Vite)
Giao diện người dùng để tương tác trực quan với hệ thống.

1. Mở một Terminal mới (Terminal 3) và di chuyển vào thư mục Frontend:
   ```bash
   cd Ecommerce_front_end
   ```
2. Cài đặt các thư viện Node.js cần thiết:
   ```bash
   npm install
   ```
3. Khởi chạy máy chủ phát triển (Vite Dev Server):
   ```bash
   npm run dev
   ```
4. Mở trình duyệt và truy cập:
   ```
   http://localhost:5173
   ```

Bây giờ bạn đã có thể tìm kiếm sản phẩm và trải nghiệm tính năng gợi ý sản phẩm tự động bằng AI theo thời gian thực!
