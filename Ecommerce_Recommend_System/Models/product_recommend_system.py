
import math
import sys
import numpy as np
import pandas as pd
import joblib
import os
import torch


class MaskedAttentionPooling(nn.Module):
    """
    [FIX v3] Attention pooling CÓ MASK — không attend vào padding.
    Thay TargetAttention cũ (không có mask → bị nhiễu bởi padding 0).
    """
    def __init__(self, channels):
        super().__init__()
        self.score = nn.Sequential(
            nn.Linear(channels * 3, channels),
            nn.Tanh(),
            nn.Linear(channels, 1),
        )
 
    def forward(self, target, history_embs, mask):
        B, T, H = history_embs.shape
        t_exp = target.unsqueeze(1).expand(-1, T, -1)
        feat  = torch.cat([t_exp, history_embs, t_exp * history_embs], dim=-1)
        scores = self.score(feat).squeeze(-1)                    # [B, T]

        # Đảm bảo mask là BoolTensor trước khi masked_fill
        mask = mask.bool()                                       # ← thêm dòng này
        scores = scores.masked_fill(mask == False, float('-inf'))
        weights = torch.softmax(scores, dim=-1)
        weights = torch.nan_to_num(weights, nan=0.0)

        return (history_embs * weights.unsqueeze(-1)).sum(dim=1)
    
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import LGConv


class ResidualBlock(nn.Module):
    def __init__(self, in_dim, out_dim, dropout_p=0.2):
        super(ResidualBlock, self).__init__()
        self.fc = nn.Linear(in_dim, out_dim)
        self.proj = nn.Linear(in_dim, out_dim)  # Phép chiếu tuyến tính hạ chiều từ 256 xuống 128
        self.bn = nn.BatchNorm1d(out_dim)
        self.drop = nn.Dropout(dropout_p)

    def forward(self, x):
        main_flow = self.fc(x)
        res_flow = self.proj(x)
        # Thực hiện phép cộng Residual giữa dòng chính và dòng tắt trước khi qua Activation
        return self.drop(F.leaky_relu(self.bn(main_flow + res_flow), 0.1))


class Neural_Network(nn.Module):
    def __init__(self, num_users, num_items, num_brand, num_category, num_main_category,
                 num_color, num_store, num_parent_asin, num_country, edge_index, edge_weight):
        super(Neural_Network, self).__init__()
        max_len = 20  
        self.item_avg_fc = nn.Linear(1, 8)
        
        # ===== 1. Embeddings Gốc =====
        self.user_embedding = nn.Embedding(num_users, 64) 
        self.item_embedding = nn.Embedding(num_items, 64)
        self.pos_embedding = nn.Embedding(max_len, 64)
        self.masked_attn = MaskedAttentionPooling(64)
        self.convs = nn.ModuleList([LGConv() for _ in range(2)]) 

        # ===== 2. Embeddings Thuộc Tính Phân Loại =====
        self.brand_embedding = nn.Embedding(num_brand, 16)           
        self.category_emb = nn.Embedding(num_category, 16)           
        self.main_category_emb = nn.Embedding(num_main_category, 8) 
        self.color_embedding = nn.Embedding(num_color, 8)           
        self.store_embedding = nn.Embedding(num_store, 16)           
        self.parent_asin_embedding = nn.Embedding(num_parent_asin, 16) 
        self.country_embedding = nn.Embedding(num_country, 4)       
        
        # Bias cho Matrix Factorization bổ trợ
        self.user_bias = nn.Embedding(num_users, 1)
        self.item_bias = nn.Embedding(num_items, 1)
        self.global_bias = nn.Parameter(torch.zeros(1))

        # Khối xử lý Chuỗi (Sequence) dữ liệu lịch sử ngắn hạn bằng GRU
        self.gru = nn.GRU(input_size=64 + 16 + 16, hidden_size=64, batch_first=True,
                          num_layers=2, dropout=0.2)
        
        # ===== 3. Các Lớp Tuyến Tính Cho Dữ Liệu Số =====
        self.price_fc = nn.Linear(1, 8)
        self.avg_rating_fc = nn.Linear(1, 8)
        self.rating_num_fc = nn.Linear(1, 8)
        self.user_stat_fc = nn.Linear(2, 8)
        self.gcn_dropout  = nn.Dropout(p=0.1)

        # ===== 4. Dropouts Chống Overfitting =====
        self.id_dropout = nn.Dropout(p=0.1)
        self.feat_dropout = nn.Dropout(p=0.1)
        self.num_dropout = nn.Dropout(p=0.1)
        self.inter_dropout = nn.Dropout(p=0.1)
        
        self.register_buffer("edge_index", edge_index)
        self.register_buffer("edge_weight", edge_weight)

        self.gcn_norms    = nn.ModuleList([nn.LayerNorm(64) for _ in range(3)])

        self.gate_u = nn.Linear(128, 64)
        self.gate_i = nn.Linear(128, 64)
     
        input_dim = 326  

        # ===== 🌟 SỬA TẠI ĐÂY: Đưa toàn bộ mạch MLP lồng cấu trúc Residual vào nn.Sequential =====
        self.mlp = nn.Sequential(
            # Lớp thứ 1: Đọc vector concat đầu vào
            nn.Linear(input_dim, 256),
            nn.BatchNorm1d(256),
            nn.LeakyReLU(0.1),
            nn.Dropout(0.3),
            
            # Lớp thứ 2: Chạy qua khối kết nối tắt Residual
            ResidualBlock(256, 128, dropout_p=0.2),
            
            # Lớp thứ 3: Tiếp tục hạ chiều tính toán sâu
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.LeakyReLU(0.1),
            nn.Dropout(0.1),
            
            # Lớp thứ 4: Vector biểu diễn đặc trưng cuối cùng trước khi dự đoán
            nn.Linear(64, 32)
        )
        self.output_layer = nn.Linear(32, 1)

    def _compute_gcn(self):
        """Chạy LGConv với gradient flow đầy đủ."""
        x_all = torch.cat([self.user_embedding.weight, self.item_embedding.weight], dim=0)
        embs  = [x_all]
        for conv, norm in zip(self.convs, self.gcn_norms):
            x_all = self.gcn_dropout(x_all)
            x_all = conv(x_all, self.edge_index, self.edge_weight)
            x_all = norm(x_all)          
            embs.append(x_all)
        final = torch.stack(embs, dim=0).mean(dim=0)
        final = F.normalize(final, p=2, dim=-1)
        n     = self.user_embedding.num_embeddings
        return final[:n], final[n:]

    @torch.no_grad()
    def update_gcn_embeddings(self):
        """Cache GCN embeddings cho eval — không cần gradient."""
        u_gcn, i_gcn          = self._compute_gcn()
        self.cached_user_gcn  = u_gcn.detach()
        self.cached_item_gcn  = i_gcn.detach()

    def forward(self, user_id, item_id, history_item_ids, history_brand_ids, history_category_ids,
                category_code, brand_code, price_value, avg_rating, rating_number, main_category, 
                user_avg, user_var, color_code, store_code, parent_asin_code, country_code, 
                item_avg_rating, training=True):
        
        if self.training:
            all_user_gcn, all_item_gcn = self._compute_gcn()
        else:
            all_user_gcn = self.cached_user_gcn
            all_item_gcn = self.cached_item_gcn

        item_avg_safe = torch.clamp(item_avg_rating, 1.0, 5.0)
        item_avg_feat = self.num_dropout(torch.tanh(self.item_avg_fc(item_avg_safe.unsqueeze(-1))))
        
        u_emb = self.user_embedding(user_id)         
        i_emb = self.item_embedding(item_id)         
        u_gcn = all_user_gcn[user_id]            
        i_gcn = all_item_gcn[item_id] 
        
        g_u = torch.sigmoid(self.gate_u(torch.cat([u_emb, u_gcn], dim=-1)))
        g_i = torch.sigmoid(self.gate_i(torch.cat([i_emb, i_gcn], dim=-1)))

        u = self.id_dropout(u_emb + g_u * u_gcn)
        i = self.id_dropout(i_emb + g_i * i_gcn)

        # ===== Trích xuất đa chuỗi hành vi lịch sử (Sequence) =====
        history_item_embs = all_item_gcn[history_item_ids]            # [B, T, 64]
        history_brand_embs = self.brand_embedding(history_brand_ids)  # [B, T, 16]
        history_cat_embs = self.category_emb(history_category_ids)    # [B, T, 16]
        
        # Kết hợp đa góc nhìn hành vi thành tensor dạng [B, T, 96]
        history_combined_embs = torch.cat([history_item_embs, history_brand_embs, history_cat_embs], dim=-1)
        
        auto_mask = (history_item_ids != 0).long()                    
        gru_out, _ = self.gru(history_combined_embs)                  
        u_seq = self.masked_attn(i, gru_out, auto_mask)               
        u_seq = self.id_dropout(u_seq)

        # Các thuộc tính phân loại khác
        b = self.feat_dropout(self.brand_embedding(brand_code))
        c = self.feat_dropout(self.category_emb(category_code))
        m_cat = self.feat_dropout(self.main_category_emb(main_category))
        color_emb = self.feat_dropout(self.color_embedding(color_code)) 
        store_emb = self.feat_dropout(self.store_embedding(store_code)) 
        parent_asin_emb = self.feat_dropout(self.parent_asin_embedding(parent_asin_code))  
        country_emb = self.feat_dropout(self.country_embedding(country_code))  

        # Chuẩn hóa dữ liệu số thực
        price_safe = torch.clamp(price_value, min=-5.0, max=5.0) 
        rating_safe = torch.clamp(avg_rating, min=0.0, max=5.0)
        rating_num_safe = torch.log1p(torch.clamp(rating_number, min=0.0))
        user_avg_safe = torch.clamp(user_avg, min=-1.5, max=1.5)
        user_var_safe = torch.log1p(torch.clamp(user_var, min=0.0))

        p = self.num_dropout(torch.tanh(self.price_fc(price_safe.unsqueeze(-1))))
        ua = self.num_dropout(torch.tanh(self.avg_rating_fc(rating_safe.unsqueeze(-1))))
        ia = self.num_dropout(torch.tanh(self.rating_num_fc(rating_num_safe.unsqueeze(-1))))
        u_stats = self.num_dropout(self.user_stat_fc(torch.stack([user_avg_safe, user_var_safe], dim=-1)))

        # Tính toán ma trận tương tác tĩnh
        dot = torch.sum(u * i, dim=-1, keepdim=True)
        cos = F.cosine_similarity(u, i, dim=-1, eps=1e-8).unsqueeze(-1)
        item_quality = ua * ia
        
        x = torch.cat([
            u, i, u_seq,
            dot, cos,
            p, ua, ia, item_quality, u_stats, item_avg_feat,
            country_emb, color_emb, store_emb, m_cat, parent_asin_emb, b, c
        ], dim=-1)

        # 🌟 GỌI QUA SEQUENTIAL: Đảm bảo tương thích 100% với cấu trúc cũ của ứng dụng
        mlp_out = self.mlp(x)

        out = self.output_layer(mlp_out).squeeze(-1)
        
        out_shifted = out + self.user_bias(user_id).squeeze(-1) \
                          + self.item_bias(item_id).squeeze(-1) \
                          + self.global_bias
        return out_shifted

num_users = int(num_users)
num_items = int(num_items)
num_category = int(num_category)
num_brand = int(num_brand)

num_main_category = int(num_main_category)
num_store = int(num_store)
num_parent_asin = int(num_parent_asin)
num_color = int(num_color)
num_country=int(num_country)

print(f"Dimensions: Users={num_users}, Items={num_items}, Brands={num_brand}")
print(f"Categories: Main={num_main_category},category={num_category}")
print(f"Additional: Stores={num_store}, Parent ASINs={num_parent_asin}, Colors={num_color},country of origin={num_country}")

import numpy as np
import pandas as pd # Import pandas for to_numeric
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader, TensorDataset
from torch.optim.lr_scheduler import CosineAnnealingLR, CosineAnnealingWarmRestarts, ReduceLROnPlateau

model = Neural_Network(
        num_users=num_users,
        num_items=num_items,
        num_category=num_category,
        num_brand=num_brand,
        num_main_category=num_main_category,
        num_color=num_color,
        num_store=num_store,
        num_parent_asin=num_parent_asin,
        num_country=num_country,
        edge_index=edge_index,
        edge_weight=edge_weight,
    )

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Thêm class-weighted loss
rating_counts = Product_Rating_Data['rating'].value_counts()
total = len(Product_Rating_Data)
df_pos = Product_Rating_Data[Product_Rating_Data['rating'] == 1]
df_neg = Product_Rating_Data[Product_Rating_Data['rating'] == 0]

pos_weight = torch.tensor([len(df_neg) / len(df_pos)]).to(device)
criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight).to(device)

optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4, weight_decay=1e-3)
# scheduler = CosineAnnealingWarmRestarts(optimizer, T_0=30, T_mult=2, eta_min=1e-6)
scheduler = ReduceLROnPlateau(
    optimizer, mode='min', factor=0.5, patience=5, 
    min_lr=1e-6
)
# scheduler = ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=2, verbose=True)
print(f"\n📊 Phân phối gốc:\n{Product_Rating_Data['rating'].value_counts()}")

df_pos = Product_Rating_Data[Product_Rating_Data['rating'] == 1]
df_neg = Product_Rating_Data[Product_Rating_Data['rating'] == 0]
df_pos_sampled = df_pos.sample(n=len(df_neg) * 2, random_state=42)
balanced_df = pd.concat([df_pos_sampled, df_neg]).sample(frac=1, random_state=42)
balanced_df = balanced_df.reset_index(drop=True)

print(f"\n✅ Sau balancing:\n{balanced_df['rating'].value_counts()}")

def build_causal_history(df, max_len=20):
    """Trả về 3 lists: item history, brand history, category history."""
    item_histories  = []
    brand_histories = []
    cat_histories   = []
    user_item_hist  = {}
    user_brand_hist = {}
    user_cat_hist   = {}

    for row in df.itertuples():
        uid   = row.user_code
        item  = row.asin_code
        brand = row.brand_code
        cat   = row.category_code

        def _pad(lst):
            return [0] * (max_len - len(lst)) + lst[-max_len:]

        item_histories.append(_pad(user_item_hist.get(uid, [])))
        brand_histories.append(_pad(user_brand_hist.get(uid, [])))
        cat_histories.append(_pad(user_cat_hist.get(uid, [])))

        user_item_hist.setdefault(uid,  []).append(item)
        user_brand_hist.setdefault(uid, []).append(brand)
        user_cat_hist.setdefault(uid,   []).append(cat)

    return item_histories, brand_histories, cat_histories

import torch
from torch.utils.data import Dataset, WeightedRandomSampler

class Electronics_RatingDataset(Dataset):
    def __init__(self, df):
        self.user_code=torch.tensor(df["user_code"].values)
        self.asin = torch.tensor(df["asin_code"].values)
        self.ratings = torch.tensor(df["rating"].values, dtype=torch.float32)
        self.category_code=torch.tensor(df["category_code"].values, dtype=torch.long)
        self.brand_code=torch.tensor(df["brand_code"].values, dtype=torch.long)
        self.price_values=torch.tensor(df["price_scaled"].values, dtype=torch.float32)
        self.avg_rating=torch.tensor(df["average_rating"].values, dtype=torch.float32)
        self.rating_number=torch.tensor(df["rating_number"].values, dtype=torch.float32)
        self.user_rating_avg=torch.tensor(df["user_avg_rating"].values, dtype=torch.float32)
        self.user_rate_var = torch.tensor(df['user_rating_var'].values, dtype=torch.float32)
        self.main_category=torch.tensor(df["main_category"].values.astype(int), dtype=torch.long)
        self.color_code=torch.tensor(df["color_code"].values, dtype=torch.long)
        self.store_code=torch.tensor(df["store_code"].values, dtype=torch.long)
        self.parent_asin_code=torch.tensor(df["parent_asin_code"].values, dtype=torch.long)
        self.country_code=torch.tensor(df["country_code"].values, dtype=torch.long)
        self.history = torch.tensor(
        np.array(df["history_list"].tolist()),
        dtype=torch.long
        )
        self.item_avg_rating = torch.tensor(
        df['item_avg_rating'].values, dtype=torch.float32
        )
        self.history       = torch.tensor(np.array(df["history_list"].tolist()),       dtype=torch.long)
        self.history_brand = torch.tensor(np.array(df["history_brand_list"].tolist()), dtype=torch.long)
        self.history_cat   = torch.tensor(np.array(df["history_cat_list"].tolist()),   dtype=torch.long)
        # self.verified_purchase = torch.tensor(df["verified_purchase"].values, dtype=torch.float32)
    def __len__(self):
        return len(self.ratings)

    def __getitem__(self, idx):
        return (self.user_code[idx],self.asin[idx],self.history[idx],self.category_code[idx],self.brand_code[idx], self.ratings[idx],self.price_values[idx]
        ,self.avg_rating[idx],self.rating_number[idx],self.main_category[idx],self.user_rating_avg[idx]
        ,self.user_rate_var[idx],self.color_code[idx],self.store_code[idx],self.parent_asin_code[idx],self.country_code[idx],
        self.item_avg_rating[idx], self.history_brand[idx], self.history_cat[idx]
       )
# ════════════════════════════════════════════════════════════
# 6. TRAIN / TEST SPLIT (stratified)
# ════════════════════════════════════════════════════════════
# FIX: Sắp xếp theo số thực và tạo lịch sử trên TOÀN BỘ dataframe trước
balanced_df = balanced_df.sort_values(by=['user_code', 'timestamp_numeric']).reset_index(drop=True)

print("⏳ Building causal history on full dataset...")
item_h, brand_h, cat_h = build_causal_history(balanced_df, max_len=20)
balanced_df['history_list']        = item_h
balanced_df['history_brand_list']  = brand_h
balanced_df['history_cat_list']    = cat_h
print("✅ Done!")

# Sau đó mới tách Train/Test (Cơ chế Stratified vẫn được giữ nguyên)
train_df, test_df = train_test_split(
    balanced_df, test_size=0.2, random_state=42,
    stratify=balanced_df['rating']
)
# Đảm bảo giữ đúng định dạng
train_df['rating'] = pd.to_numeric(train_df['rating'], errors='coerce')
test_df['rating'] = pd.to_numeric(test_df['rating'], errors='coerce')
train_df = train_df.sort_values(by=['user_code', 'timestamp']).reset_index(drop=True)
item_h, brand_h, cat_h         = build_causal_history(train_df, max_len=20)
train_df['history_list']        = item_h
train_df['history_brand_list']  = brand_h
train_df['history_cat_list']    = cat_h

test_df = test_df.sort_values(by=["user_code", "timestamp_numeric"]).reset_index(drop=True)
item_h, brand_h, cat_h        = build_causal_history(test_df, max_len=20)
test_df['history_list']        = item_h
test_df['history_brand_list']  = brand_h
test_df['history_cat_list']    = cat_h

print("⏳ Building causal history...")
print("✅ Done!")
# Convert 'rating' column to numeric type explicitly
train_df['rating'] = pd.to_numeric(train_df['rating'], errors='coerce')
test_df['rating'] = pd.to_numeric(test_df['rating'], errors='coerce')

# Drop any rows where rating conversion might have resulted in NaN (if any non-numeric data was present)
train_df.dropna(subset=['rating'], inplace=True)
test_df.dropna(subset=['rating'], inplace=True)

train_dataset = Electronics_RatingDataset(train_df)
test_dataset= Electronics_RatingDataset(test_df)

train_loader = DataLoader(train_dataset, batch_size=1024, shuffle=True)


# --- Diagnostic prints to check embedding index ranges ---
print(f"Max user_code in train_df: {train_df['user_code'].max()} (Expected max: {num_users - 1})")
print(f"Max asin_code in train_df: {train_df['asin_code'].max()} (Expected max: {num_items - 1})")
print(f"Max brand_code in train_df: {train_df['brand_code'].max()} (Expected max: {num_brand - 1})")
print(f"Max category_code in train_df: {train_df['category_code'].max()} (Expected max: {num_category - 1})")


model.to(device)
test_loader = DataLoader(test_dataset, batch_size=1024, shuffle=False)



import torch

# 1. Kiểm tra xem CUDA (GPU) có khả dụng không
cuda_available = torch.cuda.is_available()
print(f"CUDA khả dụng: {cuda_available}")

# 2. Kiểm tra thiết bị đang được sử dụng
if cuda_available:
    current_device = torch.cuda.current_device()
    print(f"Thiết bị hiện tại: {current_device}")
    print(f"Tên GPU: {torch.cuda.get_device_name(current_device)}")
else:
    print("CUDA không khả dụng. Bạn đang chạy bằng CPU.")



# ── Train ───────────────────────────────────────────────────
def train(model, train_loader, optimizer, criterion, device):
    model.train()
    total_loss = total_correct = total = 0

    for batch in train_loader:
        # Giải nén chính xác theo đúng thứ tự return của Dataset.__getitem__
        (user_batch, item_batch, history_batch, category_batch, brand_batch,
         rating_batch, price_batch, avg_rating, rating_number, main_category,
         user_avg, user_var, color_batch, store_batch, parent_asin_batch,
         country_batch, item_avg_rating, history_brand_batch, history_cat_batch) = batch

        # Đẩy dữ liệu lên thiết bị (GPU/CPU)
        optimizer.zero_grad()
        
        # TRUYỀN THAM SỐ THEO TÊN (KWARGS) - Tuyệt đối không lo lệch vị trí biến
        prediction = model(
            user_id=user_batch.to(device).long(),
            item_id=item_batch.to(device).long(),
            history_item_ids=history_batch.to(device).long(),
            history_brand_ids=history_brand_batch.to(device).long(),
            history_category_ids=history_cat_batch.to(device).long(),
            category_code=category_batch.to(device).long(),
            brand_code=brand_batch.to(device).long(),
            main_category=main_category.to(device).long(),
            color_code=color_batch.to(device).long(),
            store_code=store_batch.to(device).long(),
            parent_asin_code=parent_asin_batch.to(device).long(),
            country_code=country_batch.to(device).long(),
            price_value=price_batch.to(device).float(),
            avg_rating=avg_rating.to(device).float(),
            rating_number=rating_number.to(device).float(),
            user_avg=user_avg.to(device).float(),
            user_var=user_var.to(device).float(),
            item_avg_rating=item_avg_rating.to(device).float(),
            training=True
        ).squeeze(-1)

        rating_batch = rating_batch.to(device).float()
        loss = criterion(prediction, rating_batch)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()

        predicted_label = (prediction >= 0.5).float()
        total_correct += (predicted_label == rating_batch).sum().item()
        total_loss    += loss.item() * rating_batch.size(0)
        total         += rating_batch.size(0)

    return total_loss / total, (total_correct / total) * 100


# ── Evaluate ────────────────────────────────────────────────
def evaluate(model, test_loader, criterion, device):
    model.eval()
    total_loss = total_correct = total = 0
    all_preds, all_labels = [], []
    model.update_gcn_embeddings()
    with torch.no_grad():
        for batch in test_loader:
            (user_batch, item_batch, history_batch, category_batch, brand_batch,
             rating_batch, price_batch, avg_rating, rating_number, main_category,
             user_avg, user_var, color_batch, store_batch, parent_asin_batch,
             country_batch, item_avg_rating, history_brand_batch, history_cat_batch) = batch

            # TRUYỀN THAM SỐ THEO TÊN (KWARGS)
            prediction = model(
                user_id=user_batch.to(device).long(),
                item_id=item_batch.to(device).long(),
                history_item_ids=history_batch.to(device).long(),
                history_brand_ids=history_brand_batch.to(device).long(),
                history_category_ids=history_cat_batch.to(device).long(),
                category_code=category_batch.to(device).long(),
                brand_code=brand_batch.to(device).long(),
                main_category=main_category.to(device).long(),
                color_code=color_batch.to(device).long(),
                store_code=store_batch.to(device).long(),
                parent_asin_code=parent_asin_batch.to(device).long(),
                country_code=country_batch.to(device).long(),
                price_value=price_batch.to(device).float(),
                avg_rating=avg_rating.to(device).float(),
                rating_number=rating_number.to(device).float(),
                user_avg=user_avg.to(device).float(),
                user_var=user_var.to(device).float(),
                item_avg_rating=item_avg_rating.to(device).float(),
                training=False
            ).squeeze(-1)

            true_rating = rating_batch.to(device).float()
            loss = criterion(prediction, true_rating)
            total_loss += loss.item() * true_rating.size(0)

            predicted_label = (prediction >= 0.5).float()
            total_correct  += (predicted_label == true_rating).sum().item()
            total          += true_rating.size(0)

            all_preds.extend(predicted_label.cpu().numpy())
            all_labels.extend(true_rating.cpu().numpy())

    from sklearn.metrics import f1_score, roc_auc_score
    f1  = f1_score(all_labels, all_preds, zero_division=0)
    auc = roc_auc_score(all_labels, all_preds)

    return total_loss / total, (total_correct / total) * 100, f1, auc


# ── Training loop ───────────────────────────────────────────
best_loss = float('inf')
no_improve_epochs = 0
EARLY_STOP = 40

print("-" * 70)
print(f"{'epoch':<6} | {'train_loss':<10} | {'train_acc':<10} | {'test_loss':<10} | {'test_acc':<10} | {'F1':<6} | {'AUC':<6}")
print("-" * 70)

for epoch in range(500):
    train_loss, train_acc = train(model, train_loader, optimizer, criterion, device)
    test_loss, test_acc, f1, auc = evaluate(model, test_loader, criterion, device)

    scheduler.step(test_loss)

    if test_loss < best_loss:
        best_loss = test_loss
        no_improve_epochs = 0
        torch.save({
            'epoch': epoch + 1,
            'model_state_dict': model.state_dict(),
            'optimizer_state_dict': optimizer.state_dict(),
            'test_acc': test_acc, 'f1': f1, 'auc': auc,
        }, "./content/weights/best_model.pth")
        print(f"--> Saved ep{epoch+1} | acc={test_acc:.2f}% | F1={f1:.4f} | AUC={auc:.4f}")
    else:
        no_improve_epochs += 1
        if no_improve_epochs >= EARLY_STOP:
            print("=== Early stopping ===")
            break

    print(f"{epoch+1:<6} | {train_loss:<10.4f} | {train_acc:<10.2f}% | {test_loss:<10.4f} | {test_acc:<10.2f}% | {f1:<6.4f} | {auc:<6.4f}")