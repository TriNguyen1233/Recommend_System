"""
Orchestration Pipeline: Script chính để chạy toàn bộ quy trình Incremental Learning.

Quy trình:
  1. Kiểm tra điều kiện trigger (N >= 500 bản ghi HOẶC >= 24h)
  2. Truy vấn dữ liệu mới từ PostgreSQL
  3. Validate dữ liệu
  4. Mở rộng encoders + mã hóa dữ liệu mới
  5. Load model checkpoint + mở rộng embeddings
  6. Cập nhật đồ thị GCN
  7. Tính Fisher Information (EWC) trên mẫu dữ liệu cũ
  8. Fine-tune model trên dữ liệu mới
  9. Kiểm tra quality gate
  10. Lưu checkpoint + promote nếu đạt chất lượng

Chạy:
  python IncrementalPipeline/run_incremental.py
  python IncrementalPipeline/run_incremental.py --force    # Bỏ qua trigger check
"""

import os
import sys
import time
import argparse
import numpy as np
import pandas as pd
import torch
from torch.utils.data import DataLoader
from sklearn.model_selection import train_test_split

# Thêm project root vào path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from IncrementalPipeline.config import INCREMENTAL_CONFIG
from IncrementalPipeline.data_ingestion import (
    fetch_new_interactions_from_db,
    mark_interactions_as_trained,
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


def check_trigger_conditions():
    """
    Kiểm tra xem có nên kích hoạt incremental training không.
    Hybrid trigger: N >= 500 bản ghi mới HOẶC >= 24h kể từ lần train cuối.
    
    Returns:
        (bool, str): (should_trigger, reason)
    """
    config = INCREMENTAL_CONFIG
    
    # Check 1: Số bản ghi mới
    new_df = fetch_new_interactions_from_db()
    num_new = len(new_df)
    
    if num_new >= config["trigger_min_interactions"]:
        return True, f"Volume trigger: {num_new} >= {config['trigger_min_interactions']} bản ghi mới"
    
    # Check 2: Thời gian từ lần train cuối
    metrics_log = config["metrics_log_path"]
    if os.path.exists(metrics_log):
        df_log = pd.read_csv(metrics_log)
        if not df_log.empty:
            last_train_time = pd.to_datetime(df_log['timestamp'].iloc[-1])
            hours_since = (pd.Timestamp.now() - last_train_time).total_seconds() / 3600
            if hours_since >= config["trigger_interval_hours"]:
                if num_new > 0:
                    return True, f"Time trigger: {hours_since:.1f}h >= {config['trigger_interval_hours']}h ({num_new} bản ghi mới)"
                else:
                    return False, f"Time trigger đạt nhưng không có bản ghi mới"
    else:
        # Chưa từng train incremental → trigger nếu có data
        if num_new > 0:
            return True, f"First run: {num_new} bản ghi mới (chưa có lịch sử training)"
    
    return False, f"Chưa đạt điều kiện trigger: {num_new} bản ghi ({config['trigger_min_interactions']} cần)"


def load_old_sample_dataloader(config):
    """
    Load mẫu dữ liệu cũ (10%) để tính Fisher Information Matrix cho EWC.
    """
    old_csv = config["product_rating_csv"]
    
    if not os.path.exists(old_csv):
        print(f"  [WARN] Không tìm thấy dữ liệu cũ: {old_csv}")
        return None
    
    print(f"  Đang load mẫu dữ liệu cũ từ {old_csv}...")
    old_df = pd.read_csv(old_csv)
    
    # Merge thêm thông tin từ sản phẩm để có các cột categorical/numerical
    product_csv = config["product_data_csv"]
    if os.path.exists(product_csv):
        prod_df = pd.read_csv(product_csv)
        # Bỏ qua các cột trùng để tránh hậu tố _x _y, chỉ giữ parent_asin để làm key
        cols_to_use = [col for col in prod_df.columns if col == 'parent_asin' or col not in old_df.columns]
        old_df = old_df.merge(prod_df[cols_to_use], on='parent_asin', how='left')
    
    # Lấy mẫu 10%
    sample_ratio = config["old_data_sample_ratio"]
    sample_size = max(int(len(old_df) * sample_ratio), config["fisher_samples"])
    sample_size = min(sample_size, len(old_df))
    old_sample = old_df.sample(n=sample_size, random_state=42)
    
    # Cần build history cho old_sample
    old_sample = old_sample.sort_values(by=["user_code", "timestamp"] 
                                         if "timestamp" in old_sample.columns 
                                         else ["user_code"]).reset_index(drop=True)
    
    item_h, brand_h, cat_h = build_causal_history(old_sample, max_len=20)
    old_sample['history_list'] = item_h
    old_sample['history_brand_list'] = brand_h
    old_sample['history_cat_list'] = cat_h
    
    # Fillna cho các cột có thể thiếu
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


def load_model_from_checkpoint(checkpoint_path, device):
    """
    Load Neural_Network model từ checkpoint.
    """
    print(f"  Đang load model từ {checkpoint_path}...")
    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=False)
    
    # Cần dữ liệu cũ để xây dựng edge_index
    old_csv = INCREMENTAL_CONFIG["product_rating_csv"]
    old_df = pd.read_csv(old_csv)
    
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
    
    model.load_state_dict(checkpoint['model_state_dict'])
    model.to(device)
    
    print(f"  ✅ Model loaded (vocab: users={checkpoint['num_users']}, items={checkpoint['num_items']})")
    return model, checkpoint


def run_pipeline(force=False):
    """
    Chạy toàn bộ pipeline Incremental Learning.
    
    Args:
        force: Nếu True, bỏ qua trigger check và chạy ngay
    """
    config = INCREMENTAL_CONFIG
    device = torch.device('cpu')  # CPU-only mode
    
    print("\n" + "═" * 70)
    print("🚀 INCREMENTAL LEARNING PIPELINE")
    print(f"   Thời gian: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"   Device: {device}")
    print("═" * 70)
    
    # ── Step 1: Kiểm tra trigger ──
    if not force:
        should_trigger, reason = check_trigger_conditions()
        print(f"\n📋 Step 1 — Trigger Check: {reason}")
        if not should_trigger:
            print("  ⏸️  Chưa đạt điều kiện — pipeline kết thúc.")
            return
    else:
        print("\n📋 Step 1 — Trigger Check: SKIPPED (--force mode)")
    
    # ── Step 2: Truy vấn dữ liệu mới ──
    print("\n📋 Step 2 — Truy vấn dữ liệu mới từ PostgreSQL...")
    new_df = fetch_new_interactions_from_db()
    
    if new_df.empty:
        print("  ⏸️  Không có dữ liệu mới — pipeline kết thúc.")
        return
    
    # ── Step 3: Validate dữ liệu ──
    print("\n📋 Step 3 — Validate dữ liệu...")
    if not validate_and_report(new_df):
        print("  ❌ Dữ liệu không hợp lệ — pipeline kết thúc.")
        return
    
    # ── Step 4: Mở rộng encoders + mã hóa ──
    print("\n📋 Step 4 — Mở rộng encoders và mã hóa dữ liệu mới...")
    encoders, new_vocab_sizes = load_and_expand_encoders(new_df)
    encoded_df = encode_new_data(new_df, encoders)
    
    # Binarize rating (giống logic cũ: 5 → 1, còn lại → 0)
    if 'rating' in encoded_df.columns:
        encoded_df['rating'] = pd.to_numeric(encoded_df['rating'], errors='coerce')
        encoded_df['rating'] = np.where(encoded_df['rating'] == 5, 1, 0).astype(float)
    
    # User stats (giống data_preprocessing.py)
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
    model, old_checkpoint = load_model_from_checkpoint(config["best_model_path"], device)
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
        return
    
    # ── Step 10: Quality gate + Checkpoint ──
    print("\n📋 Step 10 — Quality gate & Checkpoint management...")
    ckpt_manager = CheckpointManager(config)
    
    # Quality gate
    passed, reason = ckpt_manager.quality_gate(metrics)
    
    # Lưu checkpoint (luôn lưu, bất kể pass/fail)
    ckpt_path = ckpt_manager.save_checkpoint(model, metrics, new_vocab_sizes)
    
    if passed:
        # Promote thành production model
        ckpt_manager.promote_to_production(ckpt_path)
        print("\n  🎉 Model mới đã được deploy thành công!")
    else:
        print(f"\n  ⚠️  Model mới KHÔNG đạt quality gate: {reason}")
        print("  Model được lưu nhưng KHÔNG promote thành production.")
        print("  Sử dụng rollback nếu cần khôi phục.")
    
    # ── Step 11: Đánh dấu dữ liệu đã xử lý ──
    if 'id' in new_df.columns:
        mark_interactions_as_trained(new_df['id'].tolist())
    
    # In checkpoint history
    ckpt_manager.print_checkpoint_history()
    
    print(f"\n  ⏱️  Pipeline hoàn tất trong {result['total_time']:.1f}s")
    print("═" * 70 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Incremental Learning Pipeline")
    parser.add_argument("--force", action="store_true", 
                        help="Bỏ qua trigger check, chạy ngay lập tức")
    args = parser.parse_args()
    
    run_pipeline(force=args.force)
