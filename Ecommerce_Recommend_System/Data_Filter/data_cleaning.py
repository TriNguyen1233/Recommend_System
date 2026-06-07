import pandas as pd
import collections

file_path = '../Data/Electronics.jsonl'
chunk_size = 500000

# ════════════════════════════════════════════════════
# THÔNG SỐ — chỉnh tại đây
# PRE_* : ngưỡng scan nhanh để giảm RAM (đặt thấp hơn TARGET)
# TARGET_* : ngưỡng k-core thực sự muốn đạt
# ════════════════════════════════════════════════════
PRE_FILTER_USER = 5    # thấp hơn target để không bỏ sót
PRE_FILTER_ITEM = 5    # thấp hơn target để không bỏ sót
TARGET_USER     = 17   # k-core thực sự
TARGET_ITEM     = 18   # k-core thực sự

# ════════════════════════════════════════════════════
# BƯỚC 1: ĐẾM TẦN SUẤT (scan nhẹ để lọc cứng extreme outliers)
# ════════════════════════════════════════════════════
print("Bước 1: Đếm tần suất...")
user_counts = collections.Counter()
item_counts = collections.Counter()

for chunk in pd.read_json(file_path, lines=True, chunksize=chunk_size):
    user_counts.update(chunk['user_id'])
    item_counts.update(chunk['asin'])

valid_users = {u for u, c in user_counts.items() if c >= PRE_FILTER_USER}
valid_items = {i for i, c in item_counts.items() if c >= PRE_FILTER_ITEM}

print(f"Pre-filter: {len(valid_users):,} users | {len(valid_items):,} items")
del user_counts, item_counts

# ════════════════════════════════════════════════════
# BƯỚC 2: LOAD DATA (chỉ load rows khớp pre-filter)
# ════════════════════════════════════════════════════
print("Bước 2: Load data...")
dtype_dict = {
    'rating': 'float32',
    'verified_purchase': 'bool',
    'helpful_vote': 'int32'
}

chunks = []
total_rows = 0

for chunk in pd.read_json(file_path, lines=True, chunksize=chunk_size):
    chunk = chunk[['user_id', 'asin', 'timestamp', 'rating',
                   'parent_asin', 'verified_purchase', 'helpful_vote']]

    for col, dtype in dtype_dict.items():
        if col in chunk.columns:
            chunk[col] = chunk[col].fillna(0).astype(dtype)

    chunk = chunk[
        chunk['user_id'].isin(valid_users) &
        chunk['asin'].isin(valid_items)
    ]
    chunk = chunk.dropna(subset=['user_id', 'asin']).drop_duplicates()

    if not chunk.empty:
        chunks.append(chunk)
        total_rows += len(chunk)
        print(f"  {total_rows:,} rows đã load...")

del valid_users, valid_items

df = pd.concat(chunks, ignore_index=True)
del chunks
print(f"Sau pre-filter: {df['user_id'].nunique():,} users | "
      f"{df['asin'].nunique():,} items | {len(df):,} rows")

# ════════════════════════════════════════════════════
# BƯỚC 3: ITERATIVE K-CORE (hội tụ thực sự)
# ════════════════════════════════════════════════════
def filter_k_core(df, min_u, min_i, verbose=True):
    iteration = 0
    while True:
        before = len(df)
        df = df[df['asin'].isin(
            df['asin'].value_counts()[lambda x: x >= min_i].index
        )]
        df = df[df['user_id'].isin(
            df['user_id'].value_counts()[lambda x: x >= min_u].index
        )]
        iteration += 1
        if verbose:
            print(f"  Vòng {iteration}: {len(df):,} rows "
                  f"({df['user_id'].nunique():,} users, "
                  f"{df['asin'].nunique():,} items)")
        if len(df) == before:
            break
    return df

print(f"\nBước 3: Iterative k-core (target u≥{TARGET_USER}, i≥{TARGET_ITEM})...")
df = filter_k_core(df, TARGET_USER, TARGET_ITEM)

# ════════════════════════════════════════════════════
# BƯỚC 4: THỐNG KÊ & LƯU
# ════════════════════════════════════════════════════
num_users   = df['user_id'].nunique()
num_items   = df['asin'].nunique()
num_ratings = len(df)
density     = num_ratings / (num_users * num_items)
sparsity    = (1 - density) * 100

print("\n" + "="*50)
print(f"Users       : {num_users:,}")
print(f"Items       : {num_items:,}")
print(f"Ratings     : {num_ratings:,}")
print(f"Min user interactions: {df['user_id'].value_counts().min()}")
print(f"Min item interactions: {df['asin'].value_counts().min()}")
print(f"Avg user interactions: {df['user_id'].value_counts().mean():.1f}")
print(f"Avg item interactions: {df['asin'].value_counts().mean():.1f}")
print(f"Density     : {density:.6f}")
print(f"Sparsity    : {sparsity:.4f}%")
print("="*50)

df.to_csv('./train_data/Electronics.csv', index=False)
print("Đã lưu xong!")