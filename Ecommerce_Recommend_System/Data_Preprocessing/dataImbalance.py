import pandas as pd
import numpy as np

Product_Rating_Data = pd.read_csv("./content/Product_Rating_Data.csv")
df_pos = Product_Rating_Data[Product_Rating_Data['rating'] == 1]
df_neg = Product_Rating_Data[Product_Rating_Data['rating'] == 0]
print("Positive reviews:", len(df_pos))
print("Negative reviews:", len(df_neg))
print("Total reviews:", len(Product_Rating_Data))
print("Percentage of positive reviews:", len(df_pos) / len(Product_Rating_Data) * 100)

print("\n========== DATA SPARSITY & DENSITY ==========")

# --- Số lượng unique users và products ---
n_users = Product_Rating_Data['user_id'].nunique()
n_items = Product_Rating_Data['asin'].nunique()
n_ratings = len(Product_Rating_Data)

print(f"Số unique users    : {n_users}")
print(f"Số unique products : {n_items}")
print(f"Số lượng ratings   : {n_ratings}")

# --- Ma trận tương tác (user x item) ---
max_possible = n_users * n_items

# Sparsity: tỉ lệ ô TRỐNG trong ma trận
sparsity = 1 - (n_ratings / max_possible)

# Density: tỉ lệ ô CÓ GIÁ TRỊ trong ma trận
density = n_ratings / max_possible

print(f"\nKích thước ma trận : {n_users} x {n_items} = {max_possible:,} ô")
print(f"Số ô có rating     : {n_ratings:,}")
print(f"Sparsity           : {sparsity * 100:.4f}%  (ô trống)")
print(f"Density            : {density * 100:.4f}%  (ô có giá trị)")

# --- Phân phối rating theo user ---
ratings_per_user = Product_Rating_Data.groupby('user_id')['rating'].count()
print(f"\n--- Rating per USER ---")
print(f"  Trung bình : {ratings_per_user.mean():.2f}")
print(f"  Median     : {ratings_per_user.median():.2f}")
print(f"  Min        : {ratings_per_user.min()}")
print(f"  Max        : {ratings_per_user.max()}")

# --- Phân phối rating theo product ---
ratings_per_item = Product_Rating_Data.groupby('asin')['rating'].count()
print(f"\n--- Rating per PRODUCT ---")
print(f"  Trung bình : {ratings_per_item.mean():.2f}")
print(f"  Median     : {ratings_per_item.median():.2f}")
print(f"  Min        : {ratings_per_item.min()}")
print(f"  Max        : {ratings_per_item.max()}")

# --- Cold-start items (sản phẩm ít được đánh giá) ---
cold_start_threshold = 5
cold_users = (ratings_per_user < cold_start_threshold).sum()
cold_items = (ratings_per_item < cold_start_threshold).sum()
print(f"\n--- Cold-start (< {cold_start_threshold} ratings) ---")
print(f"  Users ít tương tác    : {cold_users} / {n_users} ({cold_users/n_users*100:.1f}%)")
print(f"  Products ít được rate : {cold_items} / {n_items} ({cold_items/n_items*100:.1f}%)")
import numpy as np
from sklearn.utils.class_weight import compute_class_weight

weights = compute_class_weight(
    class_weight='balanced',
    classes=np.array([0, 1]),
    y=Product_Rating_Data['rating']
)

class_weight_dict = {0: weights[0], 1: weights[1]}
print("Class weights:", class_weight_dict)