"""
User Simulator: Tạo personas người dùng ảo và giả lập tương tác mua hàng
dựa trên dữ liệu sản phẩm thật từ Electronics_Product(Encoding).csv.

Mỗi Persona đại diện cho một kiểu người dùng với sở thích cụ thể:
  - Thương hiệu ưa thích (preferred_brands)
  - Danh mục ưa thích (preferred_categories)
  - Khoảng giá chấp nhận (price_range)
  - Phong cách đánh giá (rating_bias)
"""

import os
import sys
import random
import numpy as np
import pandas as pd

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ════════════════════════════════════════════════════════════
# 1. PERSONA DEFINITIONS
# ════════════════════════════════════════════════════════════

PERSONAS = [
    {
        "user_id": "SIM_USER_APPLE_FAN",
        "description": "Fan công nghệ Apple, thích thiết bị cao cấp",
        "preferred_brands": ["Apple", "Beats"],
        "preferred_categories": ["All Electronics", "Cell Phones & Accessories", "Apple Products"],
        "price_range": (30, 1500),
        "rating_bias": "generous",      # 4-5 sao cho đồ hợp, 2-3 cho đồ không hợp
    },
    {
        "user_id": "SIM_USER_BUDGET_GAMER",
        "description": "Gamer giá rẻ, thích phụ kiện gaming",
        "preferred_brands": ["Logitech", "Corsair", "HyperX", "Razer"],
        "preferred_categories": ["Computers", "All Electronics"],
        "price_range": (10, 120),
        "rating_bias": "strict",        # Khó tính: 1-2 sao cho đồ không hợp
    },
    {
        "user_id": "SIM_USER_PHOTOGRAPHER",
        "description": "Nhiếp ảnh gia, thích thiết bị camera và phụ kiện",
        "preferred_brands": ["Canon", "Sony", "SanDisk", "Samsung"],
        "preferred_categories": ["Camera & Photo", "All Electronics"],
        "price_range": (15, 800),
        "rating_bias": "moderate",
    },
    {
        "user_id": "SIM_USER_HOME_AUDIO",
        "description": "Audiophile, thích thiết bị âm thanh gia đình",
        "preferred_brands": ["Sony", "SAMSUNG", "Amazon Basics", "Anker"],
        "preferred_categories": ["Home Audio & Theater", "All Electronics", "Amazon Devices"],
        "price_range": (20, 500),
        "rating_bias": "generous",
    },
    {
        "user_id": "SIM_USER_NETWORK_TECH",
        "description": "Kỹ sư mạng, thích router và thiết bị kết nối",
        "preferred_brands": ["TP-Link", "NETGEAR", "Cable Matters", "Mediabridge"],
        "preferred_categories": ["Computers", "All Electronics", "Industrial & Scientific"],
        "price_range": (5, 200),
        "rating_bias": "strict",
    },
]


# ════════════════════════════════════════════════════════════
# 2. INTERACTION GENERATOR
# ════════════════════════════════════════════════════════════

def _compute_match_score(product_row, persona):
    """
    Tính điểm khớp giữa sản phẩm và sở thích persona.
    
    Returns:
        (match_level, is_ground_truth_positive):
            match_level: 'high', 'medium', 'low'
            is_ground_truth_positive: True nếu persona thực sự thích sản phẩm này
    """
    brand = str(product_row.get('brand', 'unk'))
    category = str(product_row.get('main_category', ''))
    price = float(product_row.get('price', 0))
    
    brand_match = brand in persona["preferred_brands"]
    category_match = category in persona["preferred_categories"]
    price_min, price_max = persona["price_range"]
    price_match = price_min <= price <= price_max
    
    score = sum([brand_match, category_match, price_match])
    
    if score >= 2:
        return 'high', True
    elif score == 1:
        return 'medium', True if brand_match else False
    else:
        return 'low', False


def _generate_rating(match_level, rating_bias):
    """
    Sinh rating dựa trên mức độ khớp và phong cách đánh giá.
    """
    if rating_bias == "generous":
        rating_map = {
            'high':   random.choice([4, 5, 5, 5]),
            'medium': random.choice([3, 4, 4]),
            'low':    random.choice([2, 3, 3]),
        }
    elif rating_bias == "strict":
        rating_map = {
            'high':   random.choice([4, 5, 5]),
            'medium': random.choice([2, 3, 3]),
            'low':    random.choice([1, 1, 2]),
        }
    else:  # moderate
        rating_map = {
            'high':   random.choice([4, 5]),
            'medium': random.choice([3, 3, 4]),
            'low':    random.choice([1, 2, 3]),
        }
    return rating_map[match_level]


def generate_synthetic_interactions(
    product_csv_path="./content/Electronics_Product(Encoding).csv",
    personas=None,
    products_per_persona=20,
    seed=42,
):
    """
    Đọc dữ liệu sản phẩm thật, sinh tương tác giả lập cho mỗi persona.
    
    Args:
        product_csv_path: Đường dẫn CSV sản phẩm
        personas: Danh sách persona (mặc định dùng PERSONAS)
        products_per_persona: Số sản phẩm mỗi persona tương tác
        seed: Random seed để kết quả reproducible
        
    Returns:
        interactions_df: DataFrame với columns [user_id, parent_asin, rating, timestamp]
        ground_truth: DataFrame với columns [user_id, parent_asin, is_positive]
    """
    random.seed(seed)
    np.random.seed(seed)
    
    if personas is None:
        personas = PERSONAS
    
    print("\n" + "═" * 60)
    print("🧑‍💻 USER SIMULATOR — Sinh dữ liệu tương tác ảo")
    print("═" * 60)
    
    # Load product data
    print(f"  Đang đọc sản phẩm từ {product_csv_path}...")
    product_df = pd.read_csv(product_csv_path)
    print(f"  ✅ Loaded {len(product_df)} sản phẩm")
    
    interactions = []
    ground_truths = []
    
    # Base timestamp: 2026-08-01 00:00:00 UTC (tương lai gần)
    base_ts = 1785369600
    ts_counter = 0
    
    for persona in personas:
        uid = persona["user_id"]
        print(f"\n  👤 Persona: {uid} — {persona['description']}")
        
        # Lấy sản phẩm khớp sở thích (ưu tiên) + sản phẩm ngẫu nhiên
        preferred_mask = (
            product_df['main_category'].isin(persona['preferred_categories']) |
            product_df['brand'].isin(persona['preferred_brands'])
        )
        preferred_products = product_df[preferred_mask]
        other_products = product_df[~preferred_mask]
        
        # Tỷ lệ: 60% sản phẩm khớp, 40% sản phẩm ngẫu nhiên (để có cả positive & negative)
        n_preferred = min(int(products_per_persona * 0.6), len(preferred_products))
        n_other = min(products_per_persona - n_preferred, len(other_products))
        
        if n_preferred > 0:
            selected_preferred = preferred_products.sample(n=n_preferred, random_state=seed)
        else:
            selected_preferred = pd.DataFrame()
            
        if n_other > 0:
            selected_other = other_products.sample(n=n_other, random_state=seed + 1)
        else:
            selected_other = pd.DataFrame()
        
        selected = pd.concat([selected_preferred, selected_other]).reset_index(drop=True)
        
        # Shuffle để thứ tự tương tác ngẫu nhiên
        selected = selected.sample(frac=1, random_state=seed).reset_index(drop=True)
        
        n_high = n_med = n_low = 0
        
        for _, prod_row in selected.iterrows():
            match_level, is_positive = _compute_match_score(prod_row, persona)
            rating = _generate_rating(match_level, persona["rating_bias"])
            
            # Timestamp tăng dần (mỗi tương tác cách nhau 5-30 phút)
            ts_counter += random.randint(300, 1800)
            
            interactions.append({
                "user_id": uid,
                "parent_asin": prod_row["parent_asin"],
                "rating": rating,
                "timestamp": base_ts + ts_counter,
            })
            
            ground_truths.append({
                "user_id": uid,
                "parent_asin": prod_row["parent_asin"],
                "is_positive": is_positive,
                "match_level": match_level,
                "actual_rating": rating,
            })
            
            if match_level == 'high':
                n_high += 1
            elif match_level == 'medium':
                n_med += 1
            else:
                n_low += 1
        
        print(f"    Tương tác: {len(selected)} sản phẩm "
              f"(high={n_high}, medium={n_med}, low={n_low})")
    
    interactions_df = pd.DataFrame(interactions)
    ground_truth_df = pd.DataFrame(ground_truths)
    
    print(f"\n  📊 Tổng kết:")
    print(f"     Tổng số tương tác : {len(interactions_df)}")
    print(f"     Số người dùng mới : {interactions_df['user_id'].nunique()}")
    print(f"     Rating trung bình : {interactions_df['rating'].mean():.2f}")
    print(f"     Positive samples  : {ground_truth_df['is_positive'].sum()}")
    print(f"     Negative samples  : {(~ground_truth_df['is_positive']).sum()}")
    print("═" * 60)
    
    return interactions_df, ground_truth_df


def save_interactions(interactions_df, output_path):
    """Lưu tương tác giả lập ra file CSV."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    interactions_df.to_csv(output_path, index=False)
    print(f"  💾 Đã lưu {len(interactions_df)} tương tác → {output_path}")


# ════════════════════════════════════════════════════════════
# 3. STANDALONE TEST
# ════════════════════════════════════════════════════════════

if __name__ == "__main__":
    interactions_df, ground_truth_df = generate_synthetic_interactions()
    
    output_dir = os.path.join(os.path.dirname(__file__), "output")
    save_interactions(interactions_df, os.path.join(output_dir, "sim_interactions.csv"))
    ground_truth_df.to_csv(os.path.join(output_dir, "sim_ground_truth.csv"), index=False)
    
    print("\n✅ Hoàn tất! Kiểm tra thư mục Simulator/output/")
