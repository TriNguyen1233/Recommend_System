# Sử dụng Python 3.10 slim làm base image
FROM python:3.10-slim

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Cài đặt các công cụ hệ thống cần thiết
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements.txt và cài đặt phụ thuộc Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ mã nguồn ứng dụng vào container
COPY . .

# Expose cổng 8000
EXPOSE 8000

# Chạy ứng dụng FastAPI thông qua uvicorn
CMD ["uvicorn", "Controller.api:app", "--host", "0.0.0.0", "--port", "8000"]
