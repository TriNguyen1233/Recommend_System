"""
Orchestration Pipeline: Main execution script for the Incremental Learning workflow.

Workflow steps:
  1. Trigger condition check (N >= 500 records OR >= 24h interval)
  2. Query new interaction data from PostgreSQL
  3. Validate incoming data
  4. Expand encoders & encode new data
  5. Load model checkpoint & expand embedding layers
  6. Update GCN graph structure
  7. Compute Fisher Information (EWC) on old data sample
  8. Fine-tune model on new data with EWC regularization
  9. Evaluate quality gate thresholds
  10. Save checkpoint & promote to production if quality gate passes

Usage:
  python IncrementalPipeline/run_incremental.py
  python IncrementalPipeline/run_incremental.py --force    # Bypass trigger check
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
    Check if incremental training should be triggered.
    Hybrid trigger: N >= 500 new interaction records OR >= 24h since last training run.
    """
    config = INCREMENTAL_CONFIG
    
    new_df = fetch_new_interactions_from_db()
    num_new = len(new_df)
    
    if num_new >= config["trigger_min_interactions"]:
        return True, f"Volume trigger: {num_new} >= {config['trigger_min_interactions']} new interaction records"
    
    metrics_log = config["metrics_log_path"]
    if os.path.exists(metrics_log):
        df_log = pd.read_csv(metrics_log)
        if not df_log.empty:
            last_train_time = pd.to_datetime(df_log['timestamp'].iloc[-1])
            hours_since = (pd.Timestamp.now() - last_train_time).total_seconds() / 3600
            if hours_since >= config["trigger_interval_hours"]:
                if num_new > 0:
                    return True, f"Time trigger: {hours_since:.1f}h >= {config['trigger_interval_hours']}h ({num_new} new records)"
                else:
                    return False, "Time trigger reached but no new interaction records found"
    else:
        if num_new > 0:
            return True, f"Initial run: {num_new} new records (no previous training history)"
    
    return False, f"Trigger conditions not met: {num_new} new records ({config['trigger_min_interactions']} required)"


def load_old_sample_dataloader(config):
    """
    Load a sample of old dataset (10%) to estimate the Fisher Information Matrix for EWC.
    """
    old_csv = config["product_rating_csv"]
    
    if not os.path.exists(old_csv):
        print(f"  [WARN] Old dataset file not found: {old_csv}")
        return None
    
    print(f"  Loading old dataset sample from {old_csv}...")
    old_df = pd.read_csv(old_csv)
    
    product_csv = config["product_data_csv"]
    if os.path.exists(product_csv):
        prod_df = pd.read_csv(product_csv)
        cols_to_use = [col for col in prod_df.columns if col == 'parent_asin' or col not in old_df.columns]
        old_df = old_df.merge(prod_df[cols_to_use], on='parent_asin', how='left')
    
    sample_ratio = config["old_data_sample_ratio"]
    sample_size = max(int(len(old_df) * sample_ratio), config["fisher_samples"])
    sample_size = min(sample_size, len(old_df))
    old_sample = old_df.sample(n=sample_size, random_state=42)
    
    old_sample = old_sample.sort_values(by=["user_code", "timestamp"] 
                                         if "timestamp" in old_sample.columns 
                                         else ["user_code"]).reset_index(drop=True)
    
    item_h, brand_h, cat_h = build_causal_history(old_sample, max_len=20)
    old_sample['history_list'] = item_h
    old_sample['history_brand_list'] = brand_h
    old_sample['history_cat_list'] = cat_h
    
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
    
    print(f"  Loaded {len(old_sample)} old dataset samples for Fisher matrix estimation")
    return loader


def load_model_from_checkpoint(checkpoint_path, device):
    """
    Load Neural_Network model architecture and weights from checkpoint.
    """
    print(f"  Loading model checkpoint from {checkpoint_path}...")
    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=False)
    
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
    
    print(f"  Model loaded successfully (vocab: users={checkpoint['num_users']}, items={checkpoint['num_items']})")
    return model, checkpoint


def run_pipeline(force=False):
    """
    Run the complete Incremental Learning pipeline.
    """
    config = INCREMENTAL_CONFIG
    device = torch.device('cpu')
    
    print("\n" + "=" * 70)
    print("INCREMENTAL LEARNING PIPELINE")
    print(f"   Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"   Device: {device}")
    print("=" * 70)
    
    if not force:
        should_trigger, reason = check_trigger_conditions()
        print(f"\nStep 1 -- Trigger Check: {reason}")
        if not should_trigger:
            print("  Pipeline execution stopped: Trigger condition not met.")
            return
    else:
        print("\nStep 1 -- Trigger Check: SKIPPED (--force mode)")
    
    print("\nStep 2 -- Fetching new interaction data from PostgreSQL...")
    new_df = fetch_new_interactions_from_db()
    
    if new_df.empty:
        print("  Pipeline execution stopped: No new interaction records found.")
        return
    
    print("\nStep 3 -- Validating input dataset...")
    if not validate_and_report(new_df):
        print("  Pipeline execution stopped: Data validation failed.")
        return
    
    print("\nStep 4 -- Expanding encoders and encoding new interactions...")
    encoders, new_vocab_sizes = load_and_expand_encoders(new_df)
    encoded_df = encode_new_data(new_df, encoders)
    
    if 'rating' in encoded_df.columns:
        encoded_df['rating'] = pd.to_numeric(encoded_df['rating'], errors='coerce')
        encoded_df['rating'] = np.where(encoded_df['rating'] == 5, 1, 0).astype(float)
    
    if 'user_id' in new_df.columns and 'rating' in new_df.columns:
        raw_ratings = pd.to_numeric(new_df['rating'], errors='coerce')
        user_avg = raw_ratings.groupby(new_df['user_id']).mean()
        user_avg = (user_avg - 3) / 2
        encoded_df['user_avg_rating'] = new_df['user_id'].map(user_avg).fillna(0)
        user_var = raw_ratings.groupby(new_df['user_id']).var().fillna(0)
        encoded_df['user_rating_var'] = new_df['user_id'].map(user_var).fillna(0)
    
    featured_df = compute_incremental_features(encoded_df)
    
    print("\nStep 5 -- Constructing causal history sequences...")
    featured_df = featured_df.sort_values(
        by=["user_code", "timestamp_numeric"] if "timestamp_numeric" in featured_df.columns else ["user_code"]
    ).reset_index(drop=True)
    
    item_h, brand_h, cat_h = build_causal_history(featured_df, max_len=20)
    featured_df['history_list'] = item_h
    featured_df['history_brand_list'] = brand_h
    featured_df['history_cat_list'] = cat_h
    
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
    
    print(f"  Training set size: {len(train_df)}, Validation set size: {len(val_df)}")
    
    print("\nStep 6 -- Loading base model and expanding embedding layers...")
    model, old_checkpoint = load_model_from_checkpoint(config["best_model_path"], device)
    model.expand_vocabularies(new_vocab_sizes)
    
    print("\nStep 7 -- Updating GCN graph structure with new interactions...")
    if 'user_code' in train_df.columns and 'asin_code' in train_df.columns:
        num_users_total = new_vocab_sizes.get('num_users', int(train_df['user_code'].max() + 1))
        new_edge_src = torch.tensor(train_df['user_code'].values, dtype=torch.long)
        new_edge_dst = torch.tensor(train_df['asin_code'].values + num_users_total, dtype=torch.long)
        new_edge_index = torch.stack([new_edge_src, new_edge_dst], dim=0)
        new_edge_weight = torch.tensor(train_df['rating'].values, dtype=torch.float32).clamp(min=0.1)
        new_edge_index = torch.cat([new_edge_index, new_edge_index.flip(0)], dim=1)
        new_edge_weight = torch.cat([new_edge_weight, new_edge_weight], dim=0)
        model.update_graph(new_edge_index, new_edge_weight)
    
    print("\nStep 8 -- Preparing old dataset sample for EWC Fisher computation...")
    old_sample_loader = load_old_sample_dataloader(config)
    
    if old_sample_loader is None:
        print("  [WARN] No old dataset sample available -- fine-tuning without EWC regularization")
    
    print("\nStep 9 -- Fine-tuning model with EWC regularization...")
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
        print("  [ERROR] Training failed: No metrics computed. Pipeline terminated.")
        return
    
    print("\nStep 10 -- Evaluating Quality Gate & Managing Checkpoints...")
    ckpt_manager = CheckpointManager(config)
    
    passed, reason = ckpt_manager.quality_gate(metrics)
    ckpt_path = ckpt_manager.save_checkpoint(model, metrics, new_vocab_sizes)
    
    if passed:
        ckpt_manager.promote_to_production(ckpt_path)
        print("\n  SUCCESS: New model checkpoint successfully deployed to production.")
    else:
        print(f"\n  [WARN] New model did not pass quality gate: {reason}")
        print("  Checkpoint saved for inspection but NOT promoted to production.")
    
    if 'id' in new_df.columns:
        mark_interactions_as_trained(new_df['id'].tolist())
    
    ckpt_manager.print_checkpoint_history()
    
    print(f"\n  Pipeline completed in {result['total_time']:.1f} seconds")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Incremental Learning Pipeline")
    parser.add_argument("--force", action="store_true", 
                        help="Bypass trigger check and run immediately")
    args = parser.parse_args()
    
    run_pipeline(force=args.force)
