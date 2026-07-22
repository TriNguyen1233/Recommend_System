# Stage 1: Build ứng dụng Java Spring Boot bằng Maven và OpenJDK 21
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Copy pom.xml để cache các dependency Maven
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy mã nguồn và đóng gói thành file .jar (bỏ qua unit test khi build container)
COPY src ./src
RUN mvn package -DskipTests

# Stage 2: Chạy ứng dụng bằng JRE 21 siêu gọn nhẹ
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy file jar từ Stage 1
COPY --from=build /app/target/*.jar app.jar

# Expose cổng 8080
EXPOSE 8080

# Chạy ứng dụng Java
ENTRYPOINT ["java", "-jar", "app.jar"]
