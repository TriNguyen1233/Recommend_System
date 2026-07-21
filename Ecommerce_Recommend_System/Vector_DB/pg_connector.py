import psycopg
import ollama
import pandas as pd
import os
from dotenv import load_dotenv
import ast
import json

load_dotenv()

def create_rich_content_embedding(row):
    try:
        title = str(getattr(row, 'title', '')).strip()
        brand = str(getattr(row, 'brand', '')).strip()
        main_cat = str(getattr(row, 'main_category', '')).strip()
        
        if not title or title.lower() == 'nan' or title.lower() == 'unknown product':
            title = "Unknown Product"
            
        rich_text = f"Product: {title}."
        if brand and brand.lower() != 'unknown' and brand.lower() != 'nan':
            rich_text += f" Brand: {brand}."
        if main_cat and main_cat.lower() != 'nan':
            rich_text += f" Category: {main_cat}."
            
        details_raw = getattr(row, 'details', {})
        details = {}
        
        if isinstance(details_raw, str):
            details_raw = details_raw.strip()
            if details_raw and details_raw.lower() != 'nan':
                try:
                    details = json.loads(details_raw)
                except Exception:
                    try:
                        details = ast.literal_eval(details_raw)
                    except Exception:
                        details = {}
        elif isinstance(details_raw, dict):
            details = details_raw
                
        if isinstance(details, dict) and details:
            spec_sentences = []
            for key, value in details.items():
                if key == 'Best Sellers Rank' or pd.isna(value) or str(value).lower() == 'nan':
                    continue
                if isinstance(value, dict):
                    value = ", ".join([f"{k}: {v}" for k, v in value.items()])
                spec_sentences.append(f"{key}: {value}")
                
            if spec_sentences:
                rich_text += " Technical Details: " + ". ".join(spec_sentences) + "."

        response = ollama.embed(
            model='nomic-embed-text',
            input=rich_text,
        )
        return response.embeddings[0]

    except Exception as e:
        print(f"-> [Lỗi xử lý Text Embedding]: {e}")
        return None

def insert_df_pg(df):
    db_name = os.getenv("DB_NAME")
    db_user = os.getenv("DB_USER")
    db_password = os.getenv("DB_PASSWORD")
    db_host = os.getenv("DB_HOST")
    db_port = os.getenv("DB_PORT")
    
    connection_string = f"dbname={db_name} user={db_user} password={db_password} host={db_host} port={db_port}"    

    print(f"Đang kết nối tới database: {db_name}...")
    
    with psycopg.connect(connection_string, autocommit=True) as conn:
        with conn.cursor() as cur:
            # Sửa câu lệnh INSERT khớp 100% với Schema của Database thực tế
            insert_query = """
                INSERT INTO public.products (
                    parent_asin, title, price, category, 
                    image_url, description, embedding, 
                    sold_quantity, status, stock_quantity
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (parent_asin) DO NOTHING; 
            """
            
            print(f"Bắt đầu xử lý và nạp {len(df)} sản phẩm...")
            
            for row in df.itertuples(index=False):
                parent_asin = "Unknown"
                try:
                    parent_asin = str(row.parent_asin)
                    vector_data = create_rich_content_embedding(row)
                    
                    if vector_data is None:
                        print(f"⚠️ Bỏ qua ASIN {parent_asin} vì lỗi Embedding.")
                        continue
                        
                    # Làm sạch dữ liệu và bốc tách các trường
                    title = str(row.title) if pd.notna(row.title) else "No Title"
                    image_url = str(row.image_url) if pd.notna(row.image_url) else ""
                    price = float(row.price) if pd.notna(row.price) else 0.0
                    category = str(row.main_category) if hasattr(row, 'main_category') and pd.notna(row.main_category) else "Electronics"
                    
                    # Bổ sung các trường dữ liệu bị thiếu để thỏa mãn điều kiện NOT NULL của DB
                    description = str(row.details) if hasattr(row, 'details') and pd.notna(row.details) else "No description available"
                    sold_quantity = 0  # Giá trị mặc định ban đầu cho sản phẩm mới nạp
                    status = "ACTIVE"  # Để trạng thái ACTIVE để hiển thị lên frontend
                    stock_quantity = 100 # Cài số lượng kho mặc định giả lập
                    
                    print(f"-> Processing: {title[:25]}... | ASIN: {parent_asin} | Vector Size: {len(vector_data)}")
                    
                    # Thực thi chèn dữ liệu
                    cur.execute(insert_query, (
                        parent_asin, title, price, category, 
                        image_url, description, vector_data, 
                        sold_quantity, status, stock_quantity
                    ))
                    
                except Exception as e:
                    print(f"!!! LỖI XẢY RA VỚI ASIN: {parent_asin} | LỖI: {e}")
                    continue

            print("\n--- ĐÃ CHÈN TOÀN BỘ DỮ LIỆU THÀNH CÔNG ---")

def main():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # Đường dẫn trỏ từ Vector_DB ra ngoài content folder
    csv_path = os.path.join(current_dir, "../content/Electronics_Product(Encoding).csv")
    
    if not os.path.exists(csv_path):
        print(f"LỖI KHÔNG TÌM THẤY FILE: {csv_path}")
        return
        
    df = pd.read_csv(csv_path)
    insert_df_pg(df)

if __name__ == "__main__":
    main()