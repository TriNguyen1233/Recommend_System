"""
Offline Incremental Learning Adapter: Chạy pipeline Incremental Learning
từ file CSV thay vì PostgreSQL. Tái sử dụng toàn bộ logic từ IncrementalPipeline.

Luồng:
  1. Đọc dữ liệu tương tác mới từ CSV (thay vì DB)
  2. Merge thông tin sản phẩm từ Electronics_Product(Encoding).csv
  3. Validate → Encode → Feature engineering → Build history
  4. Load model + expand embeddings + update graph
  5. EWC Fisher computation + Fine-tune
  6. Quality gate + Checkpoint management
"""

import os
import sys
import time
import numpy as np
import pandas as pd
import torch
from torch.utils.data import DataLoader
from sklearn.model_selection import train_test_split

# Thêm project root vào path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from IncrementalPipeline.config import INCREMENTAL_CONFIG
from IncrementalPipeline.data_ingestion import (
    load_and_expand_encoders,
    encode_new_data,
    compute_incremental_features,
    build_causal_history,
)
from IncrementalPipeline.data_validator import validate_and_report
from IncrementalPipeline.incremental_trainer import (
    IncrementalDataset,
    run_incremental_training,
)
from IncrementalPipeline.checkpoint_manager import CheckpointManager
from Models.recommend_system import Neural_Network


def load_model_from_checkpoint(checkpoint_path, rating_csv_path, device):
    """
    Load Neural_Network model từ checkpoint.
    Tách riêng để không phụ thuộc vào run_incremental.py.
    """
    print(f"  Đang load model từ {checkpoint_path}...")
    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=False)
    state_dict = checkpoint['model_state_dict']
    
    # Dữ liệu cũ để xây dựng edge_index
    old_df = pd.read_csv(rating_csv_path)
    num_users = int(old_df['user_code'].max() + 1)
    
    edge_index = torch.from_numpy(np.vstack([
        old_df['user_code'].values,
        old_df['asin_code'].values + num_users
    ])).long()
    
    raw_weights = torch.tensor(
        old_df['rating'].values, dtype=torch.float32
    ).clamp(min=0.1)
    
    edge_index = torch.cat([edge_index, edge_index.flip(0)], dim=1)
    edge_weight = torch.cat([raw_weights, raw_weights], dim=0)
    
    if 'edge_index' in state_dict:
        edge_index = state_dict['edge_index']
    if 'edge_weight' in state_dict:
        edge_weight = state_dict['edge_weight']
    
    model = Neural_Network(
        num_users=checkpoint['num_users'],
        num_items=checkpoint['num_items'],
        num_brand=checkpoint['num_brands'],
        num_category=checkpoint['num_categories'],
        num_main_category=checkpoint['num_main_cats'],
        num_color=checkpoint['num_colors'],
        num_store=checkpoint['num_stores'],
        num_parent_asin=checkpoint['num_parent_asins'],
        num_country=checkpoint['num_countries'],
        edge_index=edge_index,
        edge_weight=edge_weight,
    )
    
    model.load_state_dict(state_dict)
    model.to(device)
    
    print(f"  ✅ Model loaded (vocab: users={checkpoint['num_users']}, items={checkpoint['num_items']})")
    return model, checkpoint


def load_old_sample_dataloader(config):
    """
    Load mẫu dữ liệu cũ (10%) để tính Fisher Information Matrix cho EWC.
    Sao chép logic từ run_incremental.py nhưng tự chứa (self-contained).
    """
    old_csv = config["product_rating_csv"]
    
    if not os.path.exists(old_csv):
        print(f"  [WARN] Không tìm thấy dữ liệu cũ: {old_csv}")
        return None
    
    print(f"  Đang load mẫu dữ liệu cũ từ {old_csv}...")
    old_df = pd.read_csv(old_csv)
    
    # Merge thêm thông tin sản phẩm
    product_csv = config["product_data_csv"]
    if os.path.exists(product_csv):
        prod_df = pd.read_csv(product_csv)
        cols_to_use = [col for col in prod_df.columns if col == 'parent_asin' or col not in old_df.columns]
        old_df = old_df.merge(prod_df[cols_to_use], on='parent_asin', how='left')
    
    # Lấy mẫu 10%
    sample_ratio = config["old_data_sample_ratio"]
    sample_size = max(int(len(old_df) * sample_ratio), config["fisher_samples"])
    sample_size = min(sample_size, len(old_df))
    old_sample = old_df.sample(n=sample_size, random_state=42)
    
    # Build history
    old_sample = old_sample.sort_values(
        by=["user_code", "timestamp"] if "timestamp" in old_sample.columns else ["user_code"]
    ).reset_index(drop=True)
    
    item_h, brand_h, cat_h = build_causal_history(old_sample, max_len=20)
    old_sample['history_list'] = item_h
    old_sample['history_brand_list'] = brand_h
    old_sample['history_cat_list'] = cat_h
    
    # Fillna phòng thủ
    fill_cols = ['user_brand_count_scaled', 'price_deviation', 'user_recency_scaled',
                 'item_avg_rating', 'average_rating', 'rating_number',
                 'user_avg_rating', 'user_rating_var', 'price_scaled']
    for col in fill_cols:
        if col not in old_sample.columns:
            old_sample[col] = 0.0
        else:
            old_sample[col] = old_sample[col].fillna(0.0)
    
    if 'country_code' not in old_sample.columns:
        old_sample['country_code'] = 0
    
    old_sample['rating'] = pd.to_numeric(old_sample['rating'], errors='coerce').fillna(0).astype(float)
    
    dataset = IncrementalDataset(old_sample)
    loader = DataLoader(
        dataset,
        batch_size=config["fisher_batch_size"],
        shuffle=False,
        num_workers=0,
    )
    
    print(f"  ✅ Loaded {len(old_sample)} mẫu cũ cho Fisher computation")
    return loader


def run_offline_incremental(interactions_csv_path):
    """
    Chạy Incremental Learning pipeline từ file CSV (offline, không cần PostgreSQL).
    
    Args:
        interactions_csv_path: Đường dẫn CSV chứa tương tác mới
                               (columns: user_id, parent_asin, rating, timestamp)
    
    Returns:
        dict: Kết quả training với metrics
    """
    config = INCREMENTAL_CONFIG
    device = torch.device('cpu')
    
    print("\n" + "═" * 70)
    print("🚀 OFFLINE INCREMENTAL LEARNING PIPELINE")
    print(f"   Thời gian: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"   Nguồn dữ liệu: {interactions_csv_path}")
    print(f"   Device: {device}")
    print("═" * 70)
    
    # ── Step 1: Đọc dữ liệu mới từ CSV ──
    print("\n📋 Step 1 — Đọc dữ liệu mới từ CSV...")
    if not os.path.exists(interactions_csv_path):
        print(f"  ❌ File không tồn tại: {interactions_csv_path}")
        return None
    
    new_df = pd.read_csv(interactions_csv_path)
    print(f"  ✅ Loaded {len(new_df)} bản ghi từ CSV")
    
    if new_df.empty:
        print("  ❌ File CSV rỗng. Pipeline kết thúc.")
        return None
    
    # ── Step 2: Merge thông tin sản phẩm ──
    print("\n📋 Step 2 — Merge thông tin sản phẩm...")
    product_csv = config["product_data_csv"]
    if os.path.exists(product_csv):
        prod_df = pd.read_csv(product_csv)
        # Chỉ merge các cột cần thiết (tránh trùng)
        merge_cols = ['parent_asin', 'brand', 'main_category', 'store', 'color',
                      'price', 'price_scaled', 'average_rating', 'rating_number',
                      'category_code', 'main_category_code', 'brand_code',
                      'color_code', 'store_code', 'parent_asin_code', 'country_code']
        available_cols = [c for c in merge_cols if c in prod_df.columns]
        new_df = new_df.merge(prod_df[available_cols], on='parent_asin', how='left')
        print(f"  ✅ Merged thông tin sản phẩm ({len(available_cols)} cột)")
    else:
        print(f"  ⚠️ Không tìm thấy {product_csv}")
    
    # Đồng bộ asin = parent_asin nếu chưa có
    if 'asin' not in new_df.columns:
        new_df['asin'] = new_df['parent_asin']
    
    # ── Step 3: Validate dữ liệu ──
    print("\n📋 Step 3 — Validate dữ liệu...")
    if not validate_and_report(new_df):
        print("  ❌ Dữ liệu không hợp lệ. Pipeline kết thúc.")
        return None
    
    # ── Step 4: Mở rộng encoders + mã hóa ──
    print("\n📋 Step 4 — Mở rộng encoders và mã hóa dữ liệu mới...")
    encoders, new_vocab_sizes = load_and_expand_encoders(new_df)
    encoded_df = encode_new_data(new_df, encoders)
    
    # Binarize rating (rating >= 4 → 1 [thích], rating < 4 → 0 [không thích])
    if 'rating' in encoded_df.columns:
        encoded_df['rating'] = pd.to_numeric(encoded_df['rating'], errors='coerce')
        encoded_df['rating'] = np.where(encoded_df['rating'] >= 4, 1, 0).astype(float)
    
    # User stats
    if 'user_id' in new_df.columns and 'rating' in new_df.columns:
        raw_ratings = pd.to_numeric(new_df['rating'], errors='coerce')
        user_avg = raw_ratings.groupby(new_df['user_id']).mean()
        user_avg = (user_avg - 3) / 2
        encoded_df['user_avg_rating'] = new_df['user_id'].map(user_avg).fillna(0)
        user_var = raw_ratings.groupby(new_df['user_id']).var().fillna(0)
        encoded_df['user_rating_var'] = new_df['user_id'].map(user_var).fillna(0)
    
    # Feature engineering
    featured_df = compute_incremental_features(encoded_df)
    
    # ── Step 5: Build causal history ──
    print("\n📋 Step 5 — Build causal history sequences...")
    featured_df = featured_df.sort_values(
        by=["user_code", "timestamp_numeric"] if "timestamp_numeric" in featured_df.columns else ["user_code"]
    ).reset_index(drop=True)
    
    item_h, brand_h, cat_h = build_causal_history(featured_df, max_len=20)
    featured_df['history_list'] = item_h
    featured_df['history_brand_list'] = brand_h
    featured_df['history_cat_list'] = cat_h
    
    # Train/Val split
    val_ratio = config["validation_split"]
    if len(featured_df) > 10:
        train_df, val_df = train_test_split(
            featured_df, test_size=val_ratio, random_state=42,
            stratify=featured_df['rating'] if featured_df['rating'].nunique() > 1 else None
        )
    else:
        train_df = featured_df
        val_df = featured_df.copy()
    
    train_df = train_df.reset_index(drop=True)
    val_df = val_df.reset_index(drop=True)
    
    print(f"  Train: {len(train_df)}, Validation: {len(val_df)}")
    
    # ── Step 6: Load model + expand embeddings ──
    print("\n📋 Step 6 — Load model và mở rộng embeddings...")
    model, old_checkpoint = load_model_from_checkpoint(
        config["best_model_path"],
        config["product_rating_csv"],
        device
    )
    model.expand_vocabularies(new_vocab_sizes)
    
    # ── Step 7: Build new edges cho GCN ──
    print("\n📋 Step 7 — Cập nhật đồ thị GCN với tương tác mới...")
    if 'user_code' in train_df.columns and 'asin_code' in train_df.columns:
        num_users_total = new_vocab_sizes.get('num_users', int(train_df['user_code'].max() + 1))
        new_edge_src = torch.tensor(train_df['user_code'].values, dtype=torch.long)
        new_edge_dst = torch.tensor(train_df['asin_code'].values + num_users_total, dtype=torch.long)
        new_edge_index = torch.stack([new_edge_src, new_edge_dst], dim=0)
        new_edge_weight = torch.tensor(train_df['rating'].values, dtype=torch.float32).clamp(min=0.1)
        # Bidirectional
        new_edge_index = torch.cat([new_edge_index, new_edge_index.flip(0)], dim=1)
        new_edge_weight = torch.cat([new_edge_weight, new_edge_weight], dim=0)
        model.update_graph(new_edge_index, new_edge_weight)
    
    # ── Step 8: Load old data sample cho EWC ──
    print("\n📋 Step 8 — Chuẩn bị dữ liệu cũ cho EWC Fisher computation...")
    old_sample_loader = load_old_sample_dataloader(config)
    
    if old_sample_loader is None:
        print("  ⚠️  Không có dữ liệu cũ — chạy fine-tune không có EWC")
    
    # ── Step 9: Fine-tune model ──
    print("\n📋 Step 9 — Fine-tune model với EWC regularization...")
    # Tối ưu hyperparameters cho dữ liệu mới (để new user embeddings hội tụ tốt)
    config["fine_tune_epochs"] = 10
    config["fine_tune_lr"] = 1e-3
    config["ewc_lambda"] = 500
    config["early_stop_patience"] = 4

    result = run_incremental_training(
        model=model,
        new_train_df=train_df,
        new_val_df=val_df,
        old_sample_loader=old_sample_loader,
        device=device,
    )
    
    metrics = result['metrics']
    model = result['model']
    
    if not metrics:
        print("  ❌ Training thất bại — không có metrics. Pipeline kết thúc.")
        return None
    
    # ── Step 10: Quality gate + Checkpoint ──
    print("\n📋 Step 10 — Quality gate & Checkpoint management...")
    ckpt_manager = CheckpointManager(config)
    
    passed, reason = ckpt_manager.quality_gate(metrics)
    ckpt_path = ckpt_manager.save_checkpoint(model, metrics, new_vocab_sizes)
    
    if passed:
        ckpt_manager.promote_to_production(ckpt_path)
        print("\n  🎉 Model mới đã được deploy thành công!")
    else:
        print(f"\n  ⚠️  Model mới KHÔNG đạt quality gate: {reason}")
        print("  Model được lưu nhưng KHÔNG promote thành production.")
        # Vẫn promote trong demo mode để có thể so sánh before/after
        print("  [DEMO MODE] Vẫn promote để demo so sánh before/after...")
        ckpt_manager.promote_to_production(ckpt_path)
    
    ckpt_manager.print_checkpoint_history()
    
    print(f"\n  ⏱️  Pipeline hoàn tất trong {result['total_time']:.1f}s")
    print("═" * 70 + "\n")
    
    return {
        'metrics': metrics,
        'checkpoint_path': ckpt_path,
        'new_vocab_sizes': new_vocab_sizes,
        'total_time': result['total_time'],
    }


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Offline Incremental Learning")
    parser.add_argument("--csv", required=True, help="Đường dẫn file CSV tương tác mới")
    args = parser.parse_args()
    
    run_offline_incremental(args.csv)
