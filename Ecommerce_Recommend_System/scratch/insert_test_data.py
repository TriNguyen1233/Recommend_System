import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

db_name = os.getenv("DB_NAME")
db_user = os.getenv("DB_USER")
db_password = os.getenv("DB_PASSWORD")
db_host = os.getenv("DB_HOST", "localhost")
db_port = os.getenv("DB_PORT", "5432")

connection_string = f"dbname={db_name} user={db_user} password={db_password} host={db_host} port={db_port}"

try:
    with psycopg.connect(connection_string, autocommit=True) as conn:
        with conn.cursor() as cur:
            # 1. Reset is_trained = FALSE cho các dòng có sẵn
            cur.execute("UPDATE interactions SET is_trained = FALSE;")
            print("✅ Đã reset 5 dòng cũ về trạng thái chưa học (is_trained = FALSE).")
            
            # 2. Thêm 1 dòng mới tinh để test
            cur.execute("""
                INSERT INTO interactions (user_id, parent_asin, rating, timestamp, is_trained) 
                VALUES ('user_new_555', 'B01A0MTS3W', 5, 1721296500, FALSE);
            """)
            print("✅ Đã thêm thành công 1 bản ghi mới tinh ('user_new_555') vào database.")
            print("\nBây giờ bạn có thể chạy lại lệnh kiểm tra:")
            print("python IncrementalPipeline/run_incremental.py --force")
except Exception as e:
    print(f"❌ Lỗi: {e}")
