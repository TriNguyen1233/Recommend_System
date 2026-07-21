# 🚀 Hướng Dẫn Cài Đặt Từ A Đến Z: E-Commerce Recommendation System

Tài liệu này hướng dẫn chi tiết từng bước **từ một máy tính trắng (mới hoàn toàn chưa cài đặt gì)** đến khi cài đặt thành công, khởi chạy và vận hành toàn bộ hệ thống gợi ý sản phẩm Thương mại Điện tử.

---

## 📐 1. Tổng Quan Kiến Trúc Hệ Thống

Hệ thống bao gồm 3 thành phần chính hoạt động phối hợp:

```
[ Frontend: React + Vite ] (Port 5173)
           │
           ├──► [ Backend: Spring Boot ] (Port 8080) ──► PostgreSQL (Recommend_DB)
           │
           └──► [ AI Subsystem: FastAPI ] (Port 8000) ──► PostgreSQL + pgvector (CFRSystem)
                                   │
                                   └──► Ollama Engine (nomic-embed-text) (Port 11434)
```

| Thành phần | Công nghệ | Cổng mặc định (Port) | Đường dẫn / Docs |
| :--- | :--- | :--- | :--- |
| **Frontend** | React 19 + Vite + Bootstrap | `5173` | `http://localhost:5173` |
| **Backend** | Java 21 + Spring Boot 3 | `8080` | `http://localhost:8080/swagger-ui.html` |
| **AI Subsystem** | Python 3.10+ + FastAPI + PyTorch | `8000` | `http://127.0.0.1:8000/docs` |
| **Vector DB / Ollama** | PostgreSQL (pgvector) + Ollama | `5432` / `11434` | `nomic-embed-text` |

---

## 🛠️ 2. Bước 0: Cài Đặt Các Môi Trường Cần Thiết (Prerequisites)

> **Lưu ý**: Nếu máy của bạn hoàn toàn mới, hãy thực hiện cài đặt đầy đủ các phần mềm dưới đây trước khi bắt đầu.

### 2.1. Cài Đặt Git
1. Tải bộ cài Git tại: [git-scm.com/downloads](https://git-scm.com/downloads).
2. Chạy file installer và nhấn **Next** giữ nguyên thiết lập mặc định.
3. **Kiểm tra**: Mở Terminal/Command Prompt và gõ:
   ```bash
   git --version
   ```

### 2.2. Cài Đặt Java 21 JDK
Spring Boot Backend yêu cầu Java 21:
1. Tải **Eclipse Temurin JDK 21 (LTS)** tại: [adoptium.net](https://adoptium.net/).
2. Cài đặt và tích chọn **"Set JAVA_HOME variable"** (nếu trên Windows).
3. **Kiểm tra**:
   ```bash
   java -version
   ```
   *(Kết quả hiển thị `openjdk version "21.x.x"` là thành công)*.

### 2.3. Cài Đặt Node.js (phiên bản v18+)
1. Tải bản Node.js LTS tại: [nodejs.org](https://nodejs.org/).
2. Cài đặt theo các bước hướng dẫn mặc định.
3. **Kiểm tra**:
   ```bash
   node -v
   npm -v
   ```

### 2.4. Cài Đặt Python (phiên bản 3.10 trở lên)
1. Tải Python 3.10 hoặc 3.11 tại: [python.org/downloads](https://www.python.org/downloads/).
2. > ⚠️ **CỰC KỲ QUAN TRỌNG (Dành cho Windows)**: Đánh dấu tích vào ô **"Add python.exe to PATH"** trước khi nhấn nút **Install Now**.
3. **Kiểm tra**:
   ```bash
   python --version
   pip --version
   ```

### 2.5. Cài Đặt PostgreSQL (v15+) & Tiện Ích `pgvector`
1. **Tải và cài đặt PostgreSQL**:
   - Tải bộ cài từ: [postgresql.org/download](https://www.postgresql.org/download/).
   - Trong quá trình cài đặt, ghi nhớ **Mật khẩu (Password)** tài khoản `postgres` và cổng mặc định `5432`.
2. **Cài đặt extension `pgvector`**:
   - **Trên Windows**:
     - Tải file phát hành mới nhất từ [pgvector GitHub Releases](https://github.org/pgvector/pgvector/releases).
     - Hoặc build từ nguồn bằng C++ compiler / Docker: `docker run --name pgvector -e POSTGRES_PASSWORD=123456 -p 5432:5432 -d pgvector/pgvector:pg16`.
     - *Cách đơn giản nếu dùng PostgreSQL cài trực tiếp*: Mở Command Prompt với quyền Admin và cài qua Stack Builder hoặc tải release `.zip` copy `vector.dll` vào thư mục `lib` và `vector.control` vào `share/extension` của PostgreSQL.
   - **Trên macOS**:
     ```bash
     brew install pgvector
     ```
5. **PostgreSQL**:
   Tải PostgreSQL (https://www.enterprisedb.com/downloads/postgres-postgresql-downloads)
   * Khởi chạy PostgreSQL Server (mặc định cổng `5432`).
   * Tạo 2 cơ sở dữ liệu (Database) trống:
     * `Recommend_DB` (Dành cho Spring Boot).
     * `CFRSystem` (Dành cho AI Recommend System).
   * Kích hoạt tiện ích mở rộng **pgvector** trên cơ sở dữ liệu `CFRSystem` bằng cách mở SQL Query Tool trên DB này và chạy:
     ```sql
     CREATE EXTENSION IF NOT EXISTS vector;
     ```

---

### 🦙 2.6. Chi Tiết Các Bước Cài Đặt & Cấu Hình Ollama (Tải Model Embeddings)

Ollama đóng vai trò là AI Engine sinh ra các Vector Embedding 768 chiều cho nội dung sản phẩm.

#### **Bước 2.6.1: Tải và Cài đặt Ollama**
- Tải ứng dụng Ollama chính thức tại: [ollama.com](https://ollama.com).
- Chạy file cài đặt (`OllamaSetup.exe` trên Windows hoặc file cài tương ứng trên macOS/Linux).

#### **Bước 2.6.2: Khởi chạy dịch vụ Ollama**
- **Trên Windows / macOS**: Sau khi cài xong, ứng dụng Ollama sẽ tự động khởi chạy bên dưới khay hệ thống (System Tray).
- **Trên Linux** (hoặc chạy qua Terminal):
  ```bash
  ollama serve
  ```
- **Kiểm tra Ollama đang chạy**: Mở trình duyệt web và truy cập địa chỉ `http://localhost:11434`. Trình duyệt hiển thị dòng chữ:
  ```text
  Ollama is running
  ```
  là dịch vụ Ollama đã sẵn sàng!

#### **Bước 2.6.3: Tải AI Model Embedding (`nomic-embed-text`)**
Mở **Terminal / Command Prompt** và chạy lệnh sau để kéo model embedding về máy:
```bash
ollama pull nomic-embed-text
```
> 💡 *Dung lượng model khoảng 274MB. Quá trình tải sẽ mất từ 30s - 2 phút tùy tốc độ mạng.*

#### **Bước 2.6.4: Kiểm tra danh sách model đã tải**
Gõ lệnh sau trong Terminal để xác nhận model đã có mặt trên máy:
```bash
ollama list
```
*(Kết quả xuất hiện tên `nomic-embed-text:latest` là bạn đã cấu hình Ollama thành công)*.

---

## 📥 3. Bước 1: Clone Dự Án Từ GitHub

1. Mở Terminal/PowerShell và di chuyển tới thư mục bạn muốn lưu dự án:
   ```bash
   cd D:/Workspace  # Hoặc thư mục bất kỳ trên máy bạn
   ```
2. Thực hiện clone dự án từ GitHub:
   ```bash
   git clone <URL_REPOSITORY_CỦA_BẠN>
   cd Recommend_System
   ```

---

## 🗄️ 4. Bước 2: Hướng Dẫn Chi Tiết Tạo Database & Nạp Data Trong pgAdmin 4

Thành phần cơ sở dữ liệu gồm 2 Database:
1. `Recommend_DB`: Cơ sở dữ liệu chính của hệ thống E-commerce (Quản lý User, Đơn hàng, Giỏ hàng,...).
2. `CFRSystem`: Cơ sở dữ liệu Vector chứa thông tin Embeddings sản phẩm cho thuật toán gợi ý AI.

---

### 4.1. Tạo 2 Database Trống Trong pgAdmin 4

1. Mở ứng dụng **pgAdmin 4** trên máy tính.
2. Nhập mật khẩu Master Password (nếu được hỏi) và kết nối tới **PostgreSQL Server** (`localhost:5432`).
3. Click chuột phải vào **Databases** ➔ Select **Create** ➔ Select **Database...**:
   - **Database 1**: Nhập Database name là `Recommend_DB` ➔ Nhấn **Save**.
   - **Database 2**: Nhập Database name là `CFRSystem` ➔ Nhấn **Save**.

---

### 4.2. Kích Hoạt Tiện Ích `pgvector` Trên Database `CFRSystem`

Để PostgreSQL hỗ trợ lưu trữ và truy vấn vector tương đồng, bạn cần kích hoạt `pgvector`:

1. Trong pgAdmin 4, click chuột phải vào Database `CFRSystem`.
2. Chọn **Query Tool**.
3. Dán câu lệnh SQL sau vào ô nhập truy vấn:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
4. Nhấn nút **Execute / Run (phím F5)**.
5. *Kết quả:* Thông báo `CREATE EXTENSION Query returned successfully` xuất hiện bên dưới là thành công.

---

### 4.3. Quy Trình Nạp Dữ Liệu Sản Phẩm & Embeddings Vào PostgreSQL

Dữ liệu thô sản phẩm nằm tại file `Ecommerce_Recommend_System/content/Electronics_Product(Encoding).csv`. Dữ liệu này sẽ được tự động xử lý, sinh vector qua Ollama và chèn vào Database `CFRSystem`.

#### **Thực hiện nạp data bằng Script Python (Tự động)**:
1. Mở Terminal tại thư mục `Ecommerce_Recommend_System` (xem chi tiết thiết lập môi trường Python tại **Bước 3** bên dưới).
2. Đảm bảo file cấu hình `.env` đã chứa đúng thông tin tài khoản PostgreSQL của bạn.
3. Chạy script kết nối & nạp dữ liệu:
   ```bash
   python Vector_DB/pg_connector.py
   ```
4. **Cơ chế hoạt động của Script**:
   - Tự tạo bảng `public.products` chứa trường `embedding vector(768)` nếu chưa có.
   - Đọc dữ liệu từ file CSV sản phẩm `content/Electronics_Product(Encoding).csv`.
   - Gọi Ollama (`nomic-embed-text`) để biến đổi mô tả/tiêu đề sản phẩm thành Vector 768 chiều.
   - Chèn sản phẩm kèm Vector vào bảng `products` trong Database `CFRSystem`.

---

### 4.4. Kiểm Tra & Quản Lý Dữ Liệu Trực Tiếp Trong pgAdmin 4

Sau khi chạy xong script nạp data, bạn có thể kiểm tra trực tiếp trên **pgAdmin 4**:

#### **Cách 1: Xem giao diện bảng dữ liệu (GUI)**
1. Mở pgAdmin 4 ➔ Mở rộng database `CFRSystem`.
2. Chọn `Schemas` ➔ `public` ➔ `Tables`.
3. Click chuột phải vào bảng `products` ➔ Chọn **View/Edit Data** ➔ **First 100 Rows**.
4. Bạn sẽ thấy danh sách các sản phẩm kèm cột `embedding` dạng mảng vector `[-0.0123, 0.0456, ...]`.

#### **Cách 2: Chạy câu lệnh SQL kiểm tra (Query Tool)**
Mở **Query Tool** trên database `CFRSystem` và thực thi các câu lệnh sau:

```sql
-- 1. Kiểm tra tổng số lượng sản phẩm đã nạp vào database
SELECT COUNT(*) AS total_products FROM products;

-- 2. Xem chi tiết 5 sản phẩm đầu tiên kèm vector embedding
SELECT parent_asin, title, price, category, status, embedding 
FROM products 
LIMIT 5;

-- 3. Thử nghiệm tìm kiếm 5 sản phẩm có vector tương đồng (Cos Similarity)
SELECT parent_asin, title, price
FROM products
ORDER BY embedding <=> '[0.01, 0.02, 0.03...]'  -- Thay bằng vector thực tế
LIMIT 5;
```

---

## 🤖 5. Bước 3: Khởi Chạy AI Recommendation Subsystem (FastAPI)

Mở **Terminal 1** tại thư mục gốc của dự án `Recommend_System`:

1. **Di chuyển vào thư mục AI Subsystem**:
   ```bash
   cd Ecommerce_Recommend_System
   ```

2. **Tạo và kích hoạt Môi trường ảo (Virtual Environment - Khuyên dùng)**:
   - **Windows**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\activate
     ```
   - **macOS / Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Cài đặt các thư viện Python**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Tạo file cấu hình môi trường `.env`**:
   Tạo file tên `.env` bên trong thư mục `Ecommerce_Recommend_System` với nội dung sau:
   ```env
   DB_NAME=CFRSystem
   DB_USER=postgres
   DB_PASSWORD=12332100  # Thay bằng mật khẩu PostgreSQL của bạn
   DB_HOST=localhost
   DB_PORT=5432
   ```

5. **Nạp dữ liệu sản phẩm và tạo Vector Embeddings vào DB (Nạp Data như đã hướng dẫn ở Mục 4.3)**:
   ```bash
   python Vector_DB/pg_connector.py
   ```
   > ⏳ *Quá trình này sẽ đọc dữ liệu từ file CSV, gọi Ollama để tạo vector embedding và nạp vào PostgreSQL DB `CFRSystem`.*

6. **Khởi chạy FastAPI Server**:
   ```bash
   python Controller/api.py
   ```
   - *Dịch vụ AI sẽ khởi chạy tại: `http://127.0.0.1:8000`*
   - *Tài liệu API tương tác (Swagger UI): `http://127.0.0.1:8000/docs`*

---

## ☕ 6. Bước 4: Khởi Chạy Backend Services (Spring Boot)

Mở **Terminal 2** mới:

1. **Di chuyển vào thư mục Backend**:
   ```bash
   cd Recommend_System/Ecommerce_back_end
   ```

2. **Cấu hình Kết nối Database**:
   Mở file `src/main/resources/application.properties` và cập nhật thông tin đăng nhập PostgreSQL của bạn:
   ```properties
   spring.datasource.url=jdbc:postgresql://localhost:5432/Recommend_DB
   spring.datasource.username=postgres
   spring.datasource.password=123456  # Thay bằng mật khẩu PostgreSQL của bạn
   spring.datasource.driver-class-name=org.postgresql.Driver

   spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
   spring.jpa.hibernate.ddl-auto=update
   spring.jpa.show-sql=true
   springdoc.swagger-ui.path=/swagger-ui.html
   ```

3. **Khởi chạy Backend bằng Maven Wrapper**:
   - **Trên Windows**:
     ```powershell
     .\mvnw.cmd spring-boot:run
     ```
   - **Trên macOS / Linux**:
     ```bash
     chmod +x mvnw
     ./mvnw spring-boot:run
     ```
   - *Backend sẽ khởi chạy thành công tại: `http://localhost:8080`*
   - *Xem tài liệu API Swagger Backend tại: `http://localhost:8080/swagger-ui.html`*

---

## 💻 7. Bước 5: Khởi Chạy Client Interface (React / Vite Frontend)

Mở **Terminal 3** mới:

1. **Di chuyển vào thư mục Frontend**:
   ```bash
   cd Recommend_System/Ecommerce_front_end
   ```

2. **Cài đặt các gói thư viện Node.js**:
   ```bash
   npm install
   ```

3. **Khởi chạy Vite Development Server**:
   ```bash
   npm run dev
   ```

4. **Truy cập Giao diện Người dùng**:
   Mở trình duyệt web và truy cập địa chỉ:
   ```
   http://localhost:5173
   ```

---

## 🧪 8. Bước 6: Kiểm Tra & Vận Hành Hệ Thống

Để hệ thống hoạt động hoàn chỉnh, cả 3 cửa sổ Terminal cần được giữ ở trạng thái đang chạy:

1. **Terminal 1**: AI Subsystem (`python Controller/api.py`) -> Port `8000`.
2. **Terminal 2**: Backend Server (`mvnw spring-boot:run`) -> Port `8080`.
3. **Terminal 3**: Frontend (`npm run dev`) -> Port `5173`.
4. **Dịch vụ chạy ngầm**: PostgreSQL (`5432`) & Ollama (`11434`).

Bây giờ bạn có thể trải nghiệm các tính năng tìm kiếm sản phẩm, xem chi tiết và nhận gợi ý sản phẩm thông minh được cá nhân hóa bởi thuật toán AI theo thời gian thực!

---

## 🛠️ 9. Xử Lý Lỗi Thường Gặp (Troubleshooting)

### ❓ Lỗi 1: `ERROR: extension "vector" is not available`
- **Nguyên nhân**: PostgreSQL chưa được cài đặt module `pgvector`.
- **Cách xử lý**: Hãy chắc chắn bạn đã cài `pgvector` đúng phiên bản PostgreSQL đang dùng (Xem mục 2.5). Nếu dùng Docker, hãy chạy container official `pgvector/pgvector:pg16`.

### ❓ Lỗi 2: `Connection refused` hoặc không thể kết nối Database
- **Nguyên nhân**: PostgreSQL Service chưa khởi chạy hoặc thông tin Mật khẩu/Port trong `.env` / `application.properties` bị sai.
- **Cách xử lý**: Kiểm tra lại dịch vụ PostgreSQL trong Services (Windows) hoặc chạy `pg_isready`. Đảm bảo username/password trong `.env` và `application.properties` trùng khớp với PostgreSQL của bạn.

### ❓ Lỗi 3: `Ollama connection error` khi chạy `pg_connector.py` hoặc API
- **Nguyên nhân**: Dịch vụ Ollama chưa được bật hoặc chưa kéo model `nomic-embed-text`.
- **Cách xử lý**: Kiểm tra xem `http://localhost:11434` có phản hồi hay không, sau đó chạy lệnh `ollama pull nomic-embed-text` trong Terminal.

### ❓ Lỗi 4: Lỗi biên dịch Java/Maven khi chạy Backend
- **Nguyên nhân**: Phiên bản Java trên máy nhỏ hơn 21.
- **Cách xử lý**: Kiểm tra bằng `java -version`. Nếu chưa đúng Java 21, hãy cài lại JDK 21 và thiết lập biến môi trường `JAVA_HOME` trỏ tới JDK 21.

---

✨ **Chúc bạn cài đặt và trải nghiệm dự án thành công!**
