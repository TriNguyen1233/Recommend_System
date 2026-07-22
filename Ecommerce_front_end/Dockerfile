# Sử dụng Node.js 20 alpine làm base image
FROM node:20-alpine

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy package.json & package-lock.json để cài đặt các thư viện Frontend
COPY package*.json ./
RUN npm install

# Copy toàn bộ mã nguồn Frontend vào container
COPY . .

# Expose cổng 5173 của Vite
EXPOSE 5173

# Lệnh khởi chạy ứng dụng React Vite lắng nghe trên 0.0.0.0
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
