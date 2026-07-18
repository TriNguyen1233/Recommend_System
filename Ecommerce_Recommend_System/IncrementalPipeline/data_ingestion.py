"""
Data Ingestion Module: Truy vấn bản ghi mới từ PostgreSQL,
mở rộng LabelEncoders, và tiền xử lý đặc trưng cho dữ liệu incremental.
"""

import os
import sys
import numpy as np
import pandas as pd
import joblib
import psycopg
from dotenv import load_dotenv
from sklearn.preprocessing import StandardScaler

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from IncrementalPipeline.config import INCREMENTAL_CONFIG

load_dotenv()


# ════════════════════════════════════════════════════════════
# 1. ENCODER EXPANSION
# ════════════════════════════════════════════════════════════

def expand_encoder(encoder, new_labels):
    """
    Mở rộng LabelEncoder khi gặp nhãn chưa biết.
    Giữ nguyên thứ tự mã hóa cũ, chỉ thêm nhãn mới vào cuối.
    
    Returns:
        encoder: encoder đã mở rộng
        num_new: số nhãn mới được thêm
    """
    if not hasattr(encoder, 'classes_'):
        encoder.fit(['UNKNOWN'])
        print(f"  [ENCODER INFO] Khởi tạo encoder chưa fit bằng ['UNKNOWN']")
        
    existing = set(encoder.classes_)
    truly_new = [l for l in new_labels if l not in existing]
    num_new = len(truly_new)
    if num_new > 0:
        encoder.classes_ = np.concatenate([encoder.classes_, truly_new])
        print(f"  [ENCODER] Thêm {num_new} nhãn mới: {truly_new[:5]}{'...' if num_new > 5 else ''}")
    return encoder, num_new


def load_and_expand_encoders(new_df):
    """
    Load tất cả encoders từ đĩa, mở rộng chúng với nhãn mới từ new_df,
    và lưu lại encoders đã cập nhật.
    
    Returns:
        encoders: dict of expanded encoders
        new_vocab_sizes: dict of new vocabulary sizes (dùng cho model.expand_vocabularies)
    """
    encoding_dir = INCREMENTAL_CONFIG["encoder_dir"]
    
    encoder_map = {
        'user':           ('user_encoder.pkl',           'user_id'),
        'item':           ('item_encoder.pkl',           'asin'),
        'brand':          ('brand_encoder.pkl',          'brand'),
        'category':       ('category_encoder.pkl',       'category'),
        'store':          ('store_encoder.pkl',          'store'),
        'color':          ('color_encoder.pkl',          'color'),
        'parent':         ('parent_encoder.pkl',         'parent_asin'),
        'final_category': ('final_category_encoder.pkl', None),  # Không cần expand tự động
        'main_category':  ('main_category_encoder.pkl',  'main_category'),
    }
    
    encoders = {}
    total_new_labels = 0
    
    for name, (filename, col) in encoder_map.items():
        filepath = os.path.join(encoding_dir, filename)
        if not os.path.exists(filepath):
            print(f"  [WARN] Encoder {filename} không tìm thấy, bỏ qua.")
            continue
        encoder = joblib.load(filepath)
        
        # Đảm bảo encoder được khởi tạo classes_ nếu chưa được fit
        if not hasattr(encoder, 'classes_'):
            encoder.fit(['UNKNOWN'])
            
        if col and col in new_df.columns:
            unique_new_labels = new_df[col].dropna().unique().tolist()
            encoder, num_new = expand_encoder(encoder, unique_new_labels)
            total_new_labels += num_new
            # Lưu encoder đã mở rộng
            joblib.dump(encoder, filepath)
        
        encoders[name] = encoder
    
    print(f"  [ENCODER] Tổng số nhãn mới đã thêm: {total_new_labels}")
    
    # Tính new vocab sizes cho model expansion
    new_vocab_sizes = {}
    if 'user' in encoders:
        new_vocab_sizes['num_users'] = len(encoders['user'].classes_)
    if 'item' in encoders:
        new_vocab_sizes['num_items'] = len(encoders['item'].classes_)
    if 'brand' in encoders:
        new_vocab_sizes['num_brands'] = len(encoders['brand'].classes_)
    if 'category' in encoders:
        new_vocab_sizes['num_categories'] = len(encoders['category'].classes_)
    if 'main_category' in encoders:
        new_vocab_sizes['num_main_cats'] = len(encoders['main_category'].classes_)
    if 'color' in encoders:
        new_vocab_sizes['num_colors'] = len(encoders['color'].classes_)
    if 'store' in encoders:
        new_vocab_sizes['num_stores'] = len(encoders['store'].classes_)
    if 'parent' in encoders:
        new_vocab_sizes['num_parent_asins'] = len(encoders['parent'].classes_)
    
    return encoders, new_vocab_sizes


# ════════════════════════════════════════════════════════════
# 2. POSTGRESQL DATA QUERY
# ════════════════════════════════════════════════════════════

def fetch_new_interactions_from_db():
    """
    Truy vấn bản ghi tương tác mới từ PostgreSQL (chưa được train).
    
    Returns:
        pd.DataFrame: DataFrame chứa các tương tác mới, hoặc DataFrame rỗng nếu không có.
    """
    db_name = os.getenv("DB_NAME")
    db_user = os.getenv("DB_USER")
    db_password = os.getenv("DB_PASSWORD")
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")
    
    table = INCREMENTAL_CONFIG["db_table_interactions"]
    flag_col = INCREMENTAL_CONFIG["db_processed_flag_col"]
    
    connection_string = f"dbname={db_name} user={db_user} password={db_password} host={db_host} port={db_port}"
    
    try:
        with psycopg.connect(connection_string, autocommit=True) as conn:
            with conn.cursor() as cur:
                # 1. Tự động tạo bảng interactions nếu chưa tồn tại
                cur.execute(f"""
                    CREATE TABLE IF NOT EXISTS {table} (
                        id SERIAL PRIMARY KEY,
                        user_id VARCHAR(255) NOT NULL,
                        parent_asin VARCHAR(255) NOT NULL,
                        rating INTEGER NOT NULL,
                        timestamp BIGINT NOT NULL,
                        {flag_col} BOOLEAN DEFAULT FALSE
                    );
                """)
                
                # 2. Nếu bảng trống (chưa có dòng nào), tự động nạp 5 dòng test mẫu
                cur.execute(f"SELECT COUNT(*) FROM {table}")
                total_count = cur.fetchone()[0]
                if total_count == 0:
                    print("  [DB INFO] Bảng tương tác trống. Đang nạp 5 dòng test mẫu...")
                    cur.execute(f"""
                        INSERT INTO {table} (user_id, parent_asin, rating, timestamp, {flag_col}) VALUES
                        ('user_test_999', 'B01A0MTS3W', 5, 1721295900, FALSE),
                        ('user_test_999', 'B005OJ4N6E', 4, 1721296000, FALSE),
                        ('user_test_888', 'B01A0MTS3W', 5, 1721296100, FALSE),
                        ('user_test_888', 'B0BQGMX5PJ', 2, 1721296200, FALSE),
                        ('user_test_777', 'B00O0ADQYS', 5, 1721296300, FALSE);
                    """)
                
                # 3. Đếm số bản ghi mới
                cur.execute(f"SELECT COUNT(*) FROM {table} WHERE {flag_col} = FALSE OR {flag_col} IS NULL")
                count = cur.fetchone()[0]
                print(f"  [DB] Tìm thấy {count} bản ghi tương tác mới.")
                
                if count == 0:
                    return pd.DataFrame()
                
                # Lấy toàn bộ bản ghi mới
                cur.execute(f"""
                    SELECT * FROM {table} 
                    WHERE {flag_col} = FALSE OR {flag_col} IS NULL
                    ORDER BY timestamp ASC
                """)
                columns = [desc.name for desc in cur.description]
                rows = cur.fetchall()
                df = pd.DataFrame(rows, columns=columns)
                return df
                
    except Exception as e:
        print(f"  [DB ERROR] Lỗi kết nối hoặc truy vấn PostgreSQL: {e}")
        return pd.DataFrame()


def mark_interactions_as_trained(interaction_ids):
    """
    Đánh dấu các bản ghi đã được sử dụng để train.
    """
    if not interaction_ids:
        return
        
    db_name = os.getenv("DB_NAME")
    db_user = os.getenv("DB_USER")
    db_password = os.getenv("DB_PASSWORD")
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")
    
    table = INCREMENTAL_CONFIG["db_table_interactions"]
    flag_col = INCREMENTAL_CONFIG["db_processed_flag_col"]
    
    connection_string = f"dbname={db_name} user={db_user} password={db_password} host={db_host} port={db_port}"
    
    try:
        with psycopg.connect(connection_string, autocommit=True) as conn:
            with conn.cursor() as cur:
                # Đánh dấu batch
                placeholders = ','.join(['%s'] * len(interaction_ids))
                cur.execute(
                    f"UPDATE {table} SET {flag_col} = TRUE WHERE id IN ({placeholders})",
                    interaction_ids
                )
                print(f"  [DB] Đã đánh dấu {len(interaction_ids)} bản ghi là đã train.")
    except Exception as e:
        print(f"  [DB ERROR] Lỗi đánh dấu bản ghi: {e}")


# ════════════════════════════════════════════════════════════
# 3. FEATURE ENGINEERING (Chỉ trên dữ liệu mới)
# ════════════════════════════════════════════════════════════

def encode_new_data(new_df, encoders):
    """
    Mã hóa dữ liệu mới bằng encoders đã mở rộng.
    Giúp tránh crash khi bảng interactions thiếu cột bằng cách điền giá trị mặc định.
    
    Returns:
        pd.DataFrame: DataFrame đã được mã hóa, sẵn sàng cho training
    """
    df = new_df.copy()
    
    # Đồng bộ hóa/Fallback giữa asin và parent_asin nếu một trong hai bị thiếu
    if 'asin' not in df.columns and 'parent_asin' in df.columns:
        df['asin'] = df['parent_asin']
    elif 'parent_asin' not in df.columns and 'asin' in df.columns:
        df['parent_asin'] = df['asin']
        
    # Mã hóa các cột categorical
    encode_columns = {
        'user_id': ('user', 'user_code'),
        'asin': ('item', 'asin_code'),
        'brand': ('brand', 'brand_code'),
        'category': ('category', 'category_code'),
        'main_category': ('main_category', 'main_category_code'),
        'color': ('color', 'color_code'),
        'store': ('store', 'store_code'),
        'parent_asin': ('parent', 'parent_asin_code'),
    }
    
    # Danh sách tất cả các cột code bắt buộc đầu ra
    required_codes = ['user_code', 'asin_code', 'brand_code', 'category_code', 
                      'main_category_code', 'color_code', 'store_code', 'parent_asin_code']
    
    # Điền giá trị code mặc định phòng thủ trước
    for code_col in required_codes:
        if code_col not in df.columns:
            df[code_col] = 0
            
    for col, (encoder_name, code_col) in encode_columns.items():
        if col in df.columns and encoder_name in encoders:
            encoder = encoders[encoder_name]
            safe_values = df[col].fillna('unk').astype(str)
            known_mask = safe_values.isin(encoder.classes_)
            if known_mask.any():
                df.loc[known_mask, code_col] = encoder.transform(safe_values[known_mask])
    
    # Country code mặc định = 0 nếu không có
    if 'country_code' not in df.columns:
        df['country_code'] = 0
    
    return df


def compute_incremental_features(new_df, old_rating_df=None):
    """
    Tính toán các đặc trưng (features) cho dữ liệu incremental.
    Sử dụng thống kê từ dữ liệu cũ để đảm bảo nhất quán.
    
    Args:
        new_df: DataFrame mới đã mã hóa
        old_rating_df: DataFrame dữ liệu cũ (để tính baseline statistics)
    
    Returns:
        pd.DataFrame: DataFrame với đầy đủ features cho training
    """
    df = new_df.copy()
    
    # ── Feature A: user_brand_count_scaled ──
    if 'user_code' in df.columns and 'brand_code' in df.columns:
        user_brand_counts = (
            df.groupby(['user_code', 'brand_code']).size()
            .reset_index(name='user_brand_count')
        )
        df = df.merge(user_brand_counts, on=['user_code', 'brand_code'], how='left')
        df['user_brand_count_scaled'] = np.log1p(df['user_brand_count'].fillna(0))
        # Chuẩn hóa bằng StandardScaler
        scaler = StandardScaler()
        df['user_brand_count_scaled'] = scaler.fit_transform(df[['user_brand_count_scaled']])
    else:
        df['user_brand_count_scaled'] = 0.0
    
    # ── Feature B: price_deviation ──
    if 'price_scaled' in df.columns and 'category_code' in df.columns:
        cat_price_median = df.groupby('category_code')['price_scaled'].median().reset_index(name='cat_price_median')
        df = df.merge(cat_price_median, on='category_code', how='left')
        df['price_deviation'] = (df['price_scaled'] - df['cat_price_median']).clip(-3, 3)
        df.drop(columns=['cat_price_median'], inplace=True, errors='ignore')
    else:
        df['price_deviation'] = 0.0
    
    # ── Feature C: user_recency_scaled ──
    if 'timestamp' in df.columns:
        ts_col = df['timestamp']
        if pd.api.types.is_numeric_dtype(ts_col):
            ts_numeric = ts_col.astype('float64')
        else:
            ts_numeric = pd.to_numeric(ts_col, errors='coerce')
            if ts_numeric.isna().mean() > 0.5:
                ts_numeric = pd.to_datetime(ts_col, errors='coerce').astype('int64') // 10**9
            ts_numeric = ts_numeric.astype('float64').fillna(ts_numeric.median())
        
        df['timestamp_numeric'] = ts_numeric
        user_max_ts = df.groupby('user_code')['timestamp_numeric'].max().reset_index(name='user_max_ts')
        df = df.merge(user_max_ts, on='user_code', how='left')
        df['user_recency_raw'] = np.log1p(
            (df['user_max_ts'] - df['timestamp_numeric']).clip(lower=0)
        ).fillna(0.0)
        scaler = StandardScaler()
        df['user_recency_scaled'] = scaler.fit_transform(df[['user_recency_raw']])
    else:
        df['user_recency_scaled'] = 0.0
    
    # ── Feature D: item_avg_rating ──
    if 'asin_code' in df.columns and 'rating' in df.columns:
        item_avg_map = df.groupby('asin_code')['rating'].mean().reset_index(name='item_avg_rating')
        if 'item_avg_rating' not in df.columns:
            df = df.merge(item_avg_map, on='asin_code', how='left')
        df['item_avg_rating'] = df['item_avg_rating'].fillna(0.5)
    else:
        df['item_avg_rating'] = 0.5
    
    # ── Fillna phòng thủ ──
    fill_cols = ['user_brand_count_scaled', 'price_deviation', 'user_recency_scaled', 
                 'item_avg_rating', 'average_rating', 'rating_number', 
                 'user_avg_rating', 'user_rating_var', 'price_scaled']
    for col in fill_cols:
        if col in df.columns:
            df[col] = df[col].fillna(0.0)
        else:
            df[col] = 0.0
    
    return df


# ════════════════════════════════════════════════════════════
# 4. CAUSAL HISTORY BUILDER
# ════════════════════════════════════════════════════════════

def build_causal_history(df, max_len=20):
    """
    Xây dựng chuỗi lịch sử tương tác theo trật tự nhân quả.
    Trả về 3 danh sách: item history, brand history, category history.
    """
    item_histories = []
    brand_histories = []
    cat_histories = []
    user_item_hist = {}
    user_brand_hist = {}
    user_cat_hist = {}

    for row in df.itertuples():
        uid = row.user_code
        item = row.asin_code
        brand = row.brand_code if hasattr(row, 'brand_code') else 0
        cat = row.category_code if hasattr(row, 'category_code') else 0

        def _pad(lst):
            return [0] * (max_len - len(lst)) + lst[-max_len:]

        item_histories.append(_pad(user_item_hist.get(uid, [])))
        brand_histories.append(_pad(user_brand_hist.get(uid, [])))
        cat_histories.append(_pad(user_cat_hist.get(uid, [])))

        user_item_hist.setdefault(uid, []).append(item)
        user_brand_hist.setdefault(uid, []).append(brand)
        user_cat_hist.setdefault(uid, []).append(cat)

    return item_histories, brand_histories, cat_histories
