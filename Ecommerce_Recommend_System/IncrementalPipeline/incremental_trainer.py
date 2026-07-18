"""
Incremental Trainer Module: Fine-tuning với EWC (Elastic Weight Consolidation)
để chống Catastrophic Forgetting. Tối ưu cho CPU-only execution.
"""

import os
import sys
import time
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, Dataset
from sklearn.model_selection import train_test_split
from sklearn.metrics import f1_score, roc_auc_score

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from IncrementalPipeline.config import INCREMENTAL_CONFIG


# ════════════════════════════════════════════════════════════
# 1. DATASET CLASS (Tái sử dụng cấu trúc từ recommend_system.py)
# ════════════════════════════════════════════════════════════

class IncrementalDataset(Dataset):
    """Dataset cho dữ liệu incremental, khớp với forward() của Neural_Network."""
    
    def __init__(self, df):
        def _to_long(series):
            return torch.tensor(
                pd.to_numeric(series, errors='coerce').fillna(0).astype(np.int64).values,
                dtype=torch.long
            )
            
        def _to_float(series):
            return torch.tensor(
                pd.to_numeric(series, errors='coerce').fillna(0.0).astype(np.float32).values,
                dtype=torch.float32
            )

        self.user_code = _to_long(df["user_code"])
        self.asin = _to_long(df["asin_code"])
        self.ratings = _to_float(df["rating"])
        self.category_code = _to_long(df["category_code"])
        self.brand_code = _to_long(df["brand_code"])
        self.price_values = _to_float(df["price_scaled"])
        self.avg_rating = _to_float(df["average_rating"])
        self.rating_number = _to_float(df["rating_number"])
        self.user_rating_avg = _to_float(df["user_avg_rating"])
        self.user_rate_var = _to_float(df['user_rating_var'])
        self.main_category_code = _to_long(df["main_category_code"])
        self.color_code = _to_long(df["color_code"])
        self.store_code = _to_long(df["store_code"])
        self.parent_asin_code = _to_long(df["parent_asin_code"])
        self.country_code = _to_long(df["country_code"])
        self.item_avg_rating = _to_float(df['item_avg_rating'])
        self.user_brand_count = _to_float(df["user_brand_count_scaled"])
        self.price_deviation = _to_float(df["price_deviation"])
        self.user_recency = _to_float(df["user_recency_scaled"])
        
        self.history = torch.tensor(np.array(df["history_list"].tolist()), dtype=torch.long)
        self.history_brand = torch.tensor(np.array(df["history_brand_list"].tolist()), dtype=torch.long)
        self.history_cat = torch.tensor(np.array(df["history_cat_list"].tolist()), dtype=torch.long)

    def __len__(self):
        return len(self.ratings)

    def __getitem__(self, idx):
        return (
            self.user_code[idx], self.asin[idx], self.history[idx],
            self.history_brand[idx], self.history_cat[idx],
            self.category_code[idx], self.brand_code[idx], self.ratings[idx],
            self.price_values[idx], self.avg_rating[idx], self.rating_number[idx],
            self.main_category_code[idx], self.user_rating_avg[idx], self.user_rate_var[idx],
            self.color_code[idx], self.store_code[idx], self.parent_asin_code[idx],
            self.country_code[idx], self.item_avg_rating[idx],
            self.user_brand_count[idx], self.price_deviation[idx], self.user_recency[idx],
        )


# ════════════════════════════════════════════════════════════
# 2. EWC REGULARIZER
# ════════════════════════════════════════════════════════════

class EWCRegularizer:
    """
    Elastic Weight Consolidation (EWC) — Chống Catastrophic Forgetting.
    
    Nguyên lý: Ước lượng "tầm quan trọng" của mỗi trọng số bằng Fisher Information Matrix.
    Khi fine-tune, phạt nặng những thay đổi trên trọng số quan trọng.
    
    L_total = L_new_data + λ * Σ F_i * (θ_i - θ*_i)²
    """
    
    def __init__(self, model, old_dataloader, device, 
                 num_samples=None, ewc_lambda=None):
        """
        Args:
            model: Neural_Network model đã load checkpoint
            old_dataloader: DataLoader mẫu từ dữ liệu cũ
            device: torch device (cpu)
            num_samples: Số mẫu dùng để ước lượng Fisher
            ewc_lambda: Hệ số phạt EWC
        """
        self.ewc_lambda = ewc_lambda or INCREMENTAL_CONFIG["ewc_lambda"]
        num_samples = num_samples or INCREMENTAL_CONFIG["fisher_samples"]
        
        self.fisher = {}
        self.optimal_params = {}
        
        print(f"  [EWC] Đang tính Fisher Information Matrix ({num_samples} mẫu)...")
        start_time = time.time()
        self._compute_fisher(model, old_dataloader, device, num_samples)
        elapsed = time.time() - start_time
        print(f"  [EWC] Fisher computation hoàn tất trong {elapsed:.1f}s")
    
    def _compute_fisher(self, model, loader, device, num_samples):
        """
        Ước lượng đường chéo Fisher Information Matrix bằng gradient bình phương.
        Chạy trên CPU nên giới hạn num_samples để tối ưu thời gian.
        """
        model.eval()
        # Cache GCN embeddings trước
        model.update_gcn_embeddings()
        
        fisher = {n: torch.zeros_like(p) for n, p in model.named_parameters() if p.requires_grad}
        count = 0
        
        for batch in loader:
            if count >= num_samples:
                break
            
            d = _unpack_to_device(batch, device)
            model.zero_grad()
            
            pred = _forward(model, d)
            loss = F.binary_cross_entropy_with_logits(pred, d['rating'])
            loss.backward()
            
            for n, p in model.named_parameters():
                if p.grad is not None:
                    fisher[n] += p.grad.data ** 2
            
            count += d['rating'].size(0)
        
        # Normalize
        if count > 0:
            for n in fisher:
                fisher[n] /= count
        
        self.fisher = fisher
        self.optimal_params = {n: p.clone().detach() for n, p in model.named_parameters()}
    
    def penalty(self, model):
        """
        Tính hàm phạt EWC:  λ * Σ F_i * (θ_i - θ*_i)²
        """
        loss = torch.tensor(0.0, device=next(model.parameters()).device)
        for n, p in model.named_parameters():
            if n in self.fisher:
                loss = loss + (self.fisher[n] * (p - self.optimal_params[n]) ** 2).sum()
        return self.ewc_lambda * loss


# ════════════════════════════════════════════════════════════
# 3. HELPER FUNCTIONS (Tái sử dụng từ recommend_system.py)
# ════════════════════════════════════════════════════════════

def _unpack_to_device(batch, device):
    """Unpack 22-element batch tuple và chuyển lên device."""
    (user_b, item_b, hist_b,
     hist_brand_b, hist_cat_b,
     cat_b, brand_b, rating_b,
     price_b, avg_r, rat_num, main_cat,
     user_avg, user_var, color_b, store_b, parent_b,
     country_b, item_avg_r,
     ub_count, price_dev, recency_b) = batch

    return dict(
        user_id=user_b.to(device).long(),
        item_id=item_b.to(device).long(),
        history_item_ids=hist_b.to(device).long(),
        history_brand_ids=hist_brand_b.to(device).long(),
        history_cat_ids=hist_cat_b.to(device).long(),
        category_code=cat_b.to(device).long(),
        brand_code=brand_b.to(device).long(),
        rating=rating_b.to(device).float(),
        price_value=price_b.to(device).float(),
        avg_rating=avg_r.to(device).float(),
        rating_number=rat_num.to(device).float(),
        main_category_code=main_cat.to(device).long(),
        user_avg=user_avg.to(device).float(),
        user_var=user_var.to(device).float(),
        color_code=color_b.to(device).long(),
        store_code=store_b.to(device).long(),
        parent_asin_code=parent_b.to(device).long(),
        country_code=country_b.to(device).long(),
        item_avg_rating=item_avg_r.to(device).float(),
        user_brand_count=ub_count.to(device).float(),
        price_deviation=price_dev.to(device).float(),
        user_recency=recency_b.to(device).float(),
    )


def _forward(model, d):
    """Forward pass khớp với Neural_Network.forward()"""
    return model(
        d['user_id'], d['item_id'], d['history_item_ids'],
        d['category_code'], d['brand_code'],
        d['price_value'], d['avg_rating'], d['rating_number'],
        d['main_category_code'], d['user_avg'], d['user_var'],
        d['color_code'], d['store_code'], d['parent_asin_code'],
        d['country_code'], d['item_avg_rating'],
        d['user_brand_count'], d['price_deviation'], d['user_recency'],
        history_brand_ids=d['history_brand_ids'],
        history_cat_ids=d['history_cat_ids'],
    ).squeeze(-1)


# ════════════════════════════════════════════════════════════
# 4. INCREMENTAL TRAINING LOOP (CPU-OPTIMIZED)
# ════════════════════════════════════════════════════════════

def train_one_epoch(model, loader, optimizer, criterion, ewc_regularizer, device):
    """
    Train 1 epoch trên dữ liệu mới với EWC penalty.
    """
    model.train()
    total_loss = total_correct = total = 0
    ewc_total = 0.0

    for batch in loader:
        d = _unpack_to_device(batch, device)
        optimizer.zero_grad()

        pred = _forward(model, d)
        bce_loss = criterion(pred, d['rating'])
        
        # EWC penalty
        ewc_loss = ewc_regularizer.penalty(model)
        loss = bce_loss + ewc_loss
        
        loss.backward()
        torch.nn.utils.clip_grad_norm_(
            model.parameters(), 
            max_norm=INCREMENTAL_CONFIG["grad_clip"]
        )
        optimizer.step()

        predicted_label = (torch.sigmoid(pred) >= 0.5).float()
        total_correct += (predicted_label == d['rating']).sum().item()
        total_loss += bce_loss.item() * d['rating'].size(0)
        ewc_total += ewc_loss.item()
        total += d['rating'].size(0)

    avg_loss = total_loss / total if total > 0 else 0
    avg_acc = (total_correct / total) * 100 if total > 0 else 0
    return avg_loss, avg_acc, ewc_total


def evaluate(model, loader, criterion, device):
    """
    Đánh giá model trên tập validation/test.
    """
    model.eval()
    model.update_gcn_embeddings()

    total_loss = total_correct = total = 0
    all_probs, all_preds, all_labels = [], [], []

    with torch.no_grad():
        for batch in loader:
            d = _unpack_to_device(batch, device)
            pred = _forward(model, d)

            loss = criterion(pred, d['rating'])
            total_loss += loss.item() * d['rating'].size(0)

            probs = torch.sigmoid(pred)
            preds = (probs >= 0.5).float()

            total_correct += (preds == d['rating']).sum().item()
            total += d['rating'].size(0)

            all_probs.extend(probs.cpu().numpy())
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(d['rating'].cpu().numpy())

    avg_loss = total_loss / total if total > 0 else 0
    avg_acc = (total_correct / total) * 100 if total > 0 else 0
    f1 = f1_score(all_labels, all_preds, zero_division=0)
    
    # AUC cần ít nhất 2 classes
    try:
        auc = roc_auc_score(all_labels, all_probs)
    except ValueError:
        auc = 0.0
    
    return avg_loss, avg_acc, f1, auc


def run_incremental_training(model, new_train_df, new_val_df, 
                              old_sample_loader, device):
    """
    Pipeline chính: Fine-tune model trên dữ liệu mới với EWC.
    
    Args:
        model: Neural_Network đã load checkpoint + expanded embeddings
        new_train_df: DataFrame dữ liệu mới cho training (đã tiền xử lý)
        new_val_df: DataFrame dữ liệu mới cho validation (đã tiền xử lý)
        old_sample_loader: DataLoader mẫu từ dữ liệu cũ (cho Fisher computation)
        device: torch device
    
    Returns:
        dict: Kết quả training (metrics, model state)
    """
    config = INCREMENTAL_CONFIG
    
    print("\n" + "=" * 70)
    print("🧠 INCREMENTAL TRAINING — EWC Fine-Tuning (CPU Mode)")
    print("=" * 70)
    
    # ── Step 1: Tính EWC Fisher Information ──
    ewc = EWCRegularizer(
        model, old_sample_loader, device,
        num_samples=config["fisher_samples"],
        ewc_lambda=config["ewc_lambda"]
    )
    
    # ── Step 2: Chuẩn bị DataLoaders ──
    train_dataset = IncrementalDataset(new_train_df)
    val_dataset = IncrementalDataset(new_val_df)
    
    train_loader = DataLoader(
        train_dataset,
        batch_size=config["fine_tune_batch_size"],
        shuffle=True,
        num_workers=0,  # CPU mode: 0 workers tránh overhead
        pin_memory=False,
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=config["fine_tune_batch_size"],
        shuffle=False,
        num_workers=0,
        pin_memory=False,
    )
    
    # ── Step 3: Optimizer & Loss ──
    # Tính pos_weight từ dữ liệu mới
    df_pos = new_train_df[new_train_df['rating'] == 1]
    df_neg = new_train_df[new_train_df['rating'] == 0]
    if len(df_pos) > 0 and len(df_neg) > 0:
        pos_weight = torch.tensor([len(df_neg) / len(df_pos)]).to(device)
    else:
        pos_weight = torch.tensor([1.0]).to(device)
    
    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight).to(device)
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=config["fine_tune_lr"],
        weight_decay=config["weight_decay"],
    )
    
    # ── Step 4: Training Loop ──
    best_val_loss = float('inf')
    best_model_state = None
    best_metrics = {}
    no_improve = 0
    
    print(f"\n  Config: lr={config['fine_tune_lr']}, batch_size={config['fine_tune_batch_size']}, "
          f"epochs={config['fine_tune_epochs']}, ewc_λ={config['ewc_lambda']}")
    print(f"  Train size: {len(new_train_df)}, Val size: {len(new_val_df)}")
    print("-" * 70)
    print(f"{'Epoch':<6} | {'Train Loss':<11} | {'Train Acc':<10} | "
          f"{'Val Loss':<10} | {'Val Acc':<10} | {'F1':<7} | {'AUC':<7} | {'EWC':<10}")
    print("-" * 70)
    
    start_time = time.time()
    
    for epoch in range(config["fine_tune_epochs"]):
        epoch_start = time.time()
        
        train_loss, train_acc, ewc_penalty = train_one_epoch(
            model, train_loader, optimizer, criterion, ewc, device
        )
        val_loss, val_acc, f1, auc = evaluate(model, val_loader, criterion, device)
        
        epoch_time = time.time() - epoch_start
        
        print(f"{epoch+1:<6} | {train_loss:<11.4f} | {train_acc:<10.2f}% | "
              f"{val_loss:<10.4f} | {val_acc:<10.2f}% | {f1:<7.4f} | {auc:<7.4f} | {ewc_penalty:<10.2f} "
              f"({epoch_time:.1f}s)")
        
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_model_state = {k: v.clone() for k, v in model.state_dict().items()}
            best_metrics = {
                'epoch': epoch + 1,
                'train_loss': train_loss,
                'train_acc': train_acc,
                'val_loss': val_loss,
                'val_acc': val_acc,
                'f1': f1,
                'auc': auc,
            }
            no_improve = 0
            print(f"  --> ✅ Best model updated (val_loss={val_loss:.4f})")
        else:
            no_improve += 1
            if no_improve >= config["early_stop_patience"]:
                print(f"  --> ⏹️  Early stopping tại epoch {epoch+1}")
                break
    
    total_time = time.time() - start_time
    print(f"\n  ⏱️  Tổng thời gian fine-tuning: {total_time:.1f}s")
    
    # Restore best model state
    if best_model_state is not None:
        model.load_state_dict(best_model_state)
        print(f"  ✅ Đã khôi phục trọng số tốt nhất (epoch {best_metrics['epoch']})")
    
    return {
        'model': model,
        'metrics': best_metrics,
        'total_time': total_time,
    }
