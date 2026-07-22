# 🛒 Hệ Thống Thương Mại Điện Tử & Gợi Ý Sản Phẩm Thông Minh (E-Commerce Recommendation System)

Dự án tích hợp đa dịch vụ (Microservices Architecture) bao gồm:
* **Frontend UI**: React + Vite + TypeScript
* **Backend Core**: Java Spring Boot 3 (JDK 21) + Spring AI
* **AI Recommendation Service**: Python FastAPI + PyTorch + Graph Neural Network
* **Cơ sở dữ liệu**: PostgreSQL 15
* **AI Engine (LLM)**: Ollama (Models: `llama3`, `nomic-embed-text`)

---

## 🚀 CÁCH 1: Khởi chạy 1-Click bằng Docker (Dành cho Thầy / Người chấm bài)

Đây là cách **nhanh nhất và dễ nhất** để khởi chạy toàn bộ dự án mà **KHÔNG CẦN** cài đặt thủ công Java, Python, Node.js, PostgreSQL hay Ollama vào máy.

### 📋 Yêu cầu duy nhất:
* Máy tính đã cài đặt **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (Hỗ trợ cả Windows, macOS và Linux).

### ⚡ Các bước thực hiện:

1. **Mở Terminal / Command Prompt (CMD)** tại thư mục gốc của dự án này.
2. **Khởi chạy toàn bộ hệ thống bằng 1 lệnh duy nhất:**
   ```bash
   docker compose up -d
   ```
   > ⏳ *Lưu ý*: Trong lần đầu tiên chạy, Docker sẽ tự động tải các image cần thiết và để Ollama pull mô hình AI (`llama3` & `nomic-embed-text`). Quá trình này có thể mất từ 3 - 7 phút tùy thuộc vào tốc độ mạng.

3. **Truy cập vào ứng dụng:**
   * **Giao diện người dùng (Frontend Web)**: [http://localhost:5173](http://localhost:5173)
   * **Tài liệu API Backend (Swagger UI)**: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
   * **Tài liệu AI Recommendation API (FastAPI Docs)**: [http://localhost:8000/docs](http://localhost:8000/docs)

4. **Dừng và dọn dẹp hệ thống khi hoàn tất:**
   ```bash
   docker compose down
   ```

---

## 🛠️ CÁCH 2: Khởi chạy Thủ công (Manual Setup - Không dùng Docker)

Nếu muốn chạy trực tiếp từng thành phần trên hệ điều hành, hãy thực hiện theo thứ tự dưới đây:

### 📋 Môi trường yêu cầu (Prerequisites):
- **Node.js**: v18.0 trở lên
- **Java JDK**: JDK 21
- **Python**: 3.10 trở lên
- **PostgreSQL**: v15 (Đã tạo database `CFRSystem`, User: `postgres`, Pass: `12332100`)
- **Ollama**: Đã tải sẵn model: `ollama pull llama3` và `ollama pull nomic-embed-text`

### ⚡ Thứ tự khởi chạy 3 Module:

#### 1️⃣ Khởi chạy AI Recommendation Service (Python)
```bash
cd Ecommerce_Recommend_System

# Tạo môi trường ảo Python
python -m venv venv

# Kích hoạt venv (Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate)
venv\Scripts\activate

# Cài đặt thư viện
pip install -r requirements.txt

# Khởi chạy API Server
uvicorn Controller.api:app --host 127.0.0.1 --port 8000 --reload
```

#### 2️⃣ Khởi chạy Backend Service (Java Spring Boot)
```bash
cd Ecommerce_back_end

# Chạy bằng Maven Wrapper
# Windows:
mvnw.cmd spring-boot:run

# Mac/Linux:
./mvnw spring-boot:run
```

#### 3️⃣ Khởi chạy Frontend UI (React Vite)
```bash
cd Ecommerce_front_end

# Cài đặt thư viện
npm install

# Khởi chạy giao diện Dev
npm run dev
```

---

## 📁 Cấu Trúc Thư Mục Dự Án

```text
Recommend_System/
├── docker-compose.yml              # File điều phối Docker Compose trọn gói
├── README.md                       # Tài liệu hướng dẫn cài đặt & khởi chạy
│
├── Ecommerce_front_end/            # Frontend (React + Vite + TypeScript)
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│
├── Ecommerce_back_end/             # Backend Core (Java Spring Boot 3)
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/main/resources/application.properties
│
└── Ecommerce_Recommend_System/     # AI Recommendation Engine (FastAPI + PyTorch)
    ├── Dockerfile
    ├── requirements.txt
    ├── Predict.py
    └── Controller/api.py
```

---

## 📞 Hỗ trợ & Khắc phục lỗi thường gặp

* **Lỗi Cổng (Port occupied)**: Đảm bảo các cổng `5173`, `8080`, `8000`, `5432`, `11434` trên máy không bị ứng dụng khác chiếm dụng trước khi chạy.
* **Xem logs trong Docker**: Để xem log hoạt động của từng dịch vụ, gõ:
  ```bash
  docker compose logs -f [tên_service]
  # Ví dụ: docker compose logs -f backend-service
  ```
