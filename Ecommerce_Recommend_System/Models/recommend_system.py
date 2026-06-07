import math
import sys
import numpy as np
import pandas as pd
import joblib
import os
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import LGConv
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import f1_score, roc_auc_score
from torch.utils.data import DataLoader, Dataset
from torch.optim.lr_scheduler import ReduceLROnPlateau



# ════════════════════════════════════════════════════════════
# 5. MODEL
# ════════════════════════════════════════════════════════════

class MaskedAttentionPooling(nn.Module):
    def __init__(self, channels):
        super().__init__()
        self.score = nn.Sequential(
            nn.Linear(channels * 3, channels),
            nn.Tanh(),
            nn.Linear(channels, 1),
        )

    def forward(self, target, history_embs, mask):
        B, T, H  = history_embs.shape
        t_exp    = target.unsqueeze(1).expand(-1, T, -1)
        feat     = torch.cat([t_exp, history_embs, t_exp * history_embs], dim=-1)
        scores   = self.score(feat).squeeze(-1)
        scores   = scores.masked_fill(mask.bool() == False, float('-inf'))
        weights  = torch.softmax(scores, dim=-1)
        weights  = torch.nan_to_num(weights, nan=0.0)
        return (history_embs * weights.unsqueeze(-1)).sum(dim=1)


class Neural_Network(nn.Module):
    # ── Embedding dims ──────────────────────────────────────
    EMB_USER  = 64
    EMB_ITEM  = 64
    EMB_BRAND = 32   # FIX 3: tăng từ 16 → 32 để mang nhiều thông tin hơn
    EMB_CAT   = 16
    EMB_MCAT  = 8
    EMB_COLOR = 8
    EMB_STORE = 16
    EMB_PAR   = 16
    EMB_CTRY  = 4
    NUM_OUT   = 8    # chiều output của mỗi FC số

    def __init__(self, num_users, num_items, num_brand, num_category, num_main_category,
                 num_color, num_store, num_parent_asin, num_country, edge_index, edge_weight):
        super().__init__()

        E = self.EMB_USER   # 64

        # ── Embeddings gốc ──────────────────────────────────
        self.user_embedding = nn.Embedding(num_users, E)
        self.item_embedding = nn.Embedding(num_items, E)
        self.masked_attn    = MaskedAttentionPooling(E)

        # FIX 2: GCN — bỏ @no_grad, dùng LayerNorm thay clamp, thêm edge dropout
        self.convs        = nn.ModuleList([LGConv() for _ in range(3)])
        self.gcn_norms    = nn.ModuleList([nn.LayerNorm(E) for _ in range(3)])
        self.gcn_dropout  = nn.Dropout(p=0.1)

        # ── Embeddings thuộc tính ────────────────────────────
        self.brand_embedding       = nn.Embedding(num_brand,       self.EMB_BRAND)
        self.category_emb          = nn.Embedding(num_category,    self.EMB_CAT)
        self.main_category_emb     = nn.Embedding(num_main_category, self.EMB_MCAT)
        self.color_embedding       = nn.Embedding(num_color,       self.EMB_COLOR)
        self.store_embedding       = nn.Embedding(num_store,       self.EMB_STORE)
        self.parent_asin_embedding = nn.Embedding(num_parent_asin, self.EMB_PAR)
        self.country_embedding     = nn.Embedding(num_country,     self.EMB_CTRY)

        # MF bias
        self.user_bias   = nn.Embedding(num_users, 1)
        self.item_bias   = nn.Embedding(num_items, 1)
        self.global_bias = nn.Parameter(torch.zeros(1))

        # FIX 3: GRU input = GCN emb + brand + category (enrich sequence)
        gru_in = E + self.EMB_BRAND + self.EMB_CAT  # 64 + 32 + 16 = 112
        self.gru = nn.GRU(input_size=gru_in, hidden_size=E, batch_first=True,
                          num_layers=2, dropout=0.2)  # tăng lên 2 lớp

        # ── FC cho dữ liệu số ────────────────────────────────
        N = self.NUM_OUT
        self.item_avg_fc   = nn.Linear(1, N)
        self.price_fc      = nn.Linear(1, N)
        self.avg_rating_fc = nn.Linear(1, N)
        self.rating_num_fc = nn.Linear(1, N)
        self.user_stat_fc  = nn.Linear(2, N)
        self.user_brand_fc = nn.Linear(1, N)
        self.price_dev_fc  = nn.Linear(1, N)
        self.recency_fc    = nn.Linear(1, N)

        # Brand projector: chiếu brand lên E=64 cho dot product
        self.brand_projector = nn.Linear(self.EMB_BRAND, E)

        # FIX 4: tăng dropout toàn bộ
        self.id_dropout   = nn.Dropout(p=0.2)   # tăng từ 0.1
        self.feat_dropout = nn.Dropout(p=0.15)  # tăng từ 0.1
        self.num_dropout  = nn.Dropout(p=0.15)  # tăng từ 0.1

        # Gating GCN
        self.gate_u = nn.Linear(E * 2, E)
        self.gate_i = nn.Linear(E * 2, E)

        # Graph buffers
        self.register_buffer("edge_index",  edge_index)
        self.register_buffer("edge_weight", edge_weight)

        # ── FIX 5: tính input_dim động ──────────────────────
        # u(64) + i(64) + u_seq(64) = 192
        # dot(1) + cos(1) = 2
        # p(8)+ua(8)+ia(8)+item_quality(8)+u_stats(8)+item_avg_feat(8) = 48
        # country(4)+color(8)+store(16)+m_cat(8)+parent(16)+b(32)+c(16) = 100
        # ub(8)+pd(8)+rec(8) = 24
        # user_brand_dot(1)+user_seq_dot(1) = 2
        # Total = 192+2+48+100+24+2 = 368
        input_dim = (
            E * 3 +                                              # u, i, u_seq
            2 +                                                  # dot, cos
            N * 6 +                                              # p,ua,ia,item_quality,u_stats,item_avg
            self.EMB_CTRY + self.EMB_COLOR + self.EMB_STORE +
            self.EMB_MCAT + self.EMB_PAR + self.EMB_BRAND + self.EMB_CAT +
            N * 3 +                                              # ub,pd,rec
            2                                                    # user_brand_dot, user_seq_dot
        )
        print(f"[INFO] MLP input_dim = {input_dim}")

        # FIX 4: tăng dropout MLP đồng đều hơn, thêm residual connection
        self.mlp_fc1 = nn.Linear(input_dim, 256)
        self.mlp_bn1 = nn.BatchNorm1d(256)
        self.mlp_fc2 = nn.Linear(256, 128)
        self.mlp_bn2 = nn.BatchNorm1d(128)
        self.mlp_fc3 = nn.Linear(128, 64)
        self.mlp_bn3 = nn.BatchNorm1d(64)
        self.mlp_fc4 = nn.Linear(64, 32)

        self.mlp_drop1 = nn.Dropout(0.4)   # tăng từ 0.3
        self.mlp_drop2 = nn.Dropout(0.3)   # tăng từ 0.2
        self.mlp_drop3 = nn.Dropout(0.2)   # tăng từ 0.1

        # Residual projection: 256→128 để cộng vào layer 2
        self.res_proj = nn.Linear(256, 128)

        self.output_layer = nn.Linear(32, 1)

        self._init_weights()

    def _init_weights(self):
        """Xavier init cho Linear, Normal cho Embedding."""
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.xavier_uniform_(m.weight)
                if m.bias is not None:
                    nn.init.zeros_(m.bias)
            elif isinstance(m, nn.Embedding):
                nn.init.normal_(m.weight, mean=0.0, std=0.01)
        # bias embeddings gần 0
        nn.init.zeros_(self.user_bias.weight)
        nn.init.zeros_(self.item_bias.weight)

    # ── FIX 2: GCN với gradient + LayerNorm ─────────────────
    def _compute_gcn(self):
        """Chạy LGConv với gradient flow đầy đủ."""
        x_all = torch.cat([self.user_embedding.weight, self.item_embedding.weight], dim=0)
        embs  = [x_all]
        for conv, norm in zip(self.convs, self.gcn_norms):
            x_all = self.gcn_dropout(x_all)
            x_all = conv(x_all, self.edge_index, self.edge_weight)
            x_all = norm(x_all)          # LayerNorm thay clamp — ổn định hơn nhiều
            embs.append(x_all)
        final = torch.stack(embs, dim=0).mean(dim=0)
        final = F.normalize(final, p=2, dim=-1)
        n     = self.user_embedding.num_embeddings
        return final[:n], final[n:]

    # Giữ lại update_gcn_embeddings để tương thích với training loop cũ
    # nhưng bây giờ nó CHỈ được dùng ở eval (no_grad) nếu muốn cache
    @torch.no_grad()
    def update_gcn_embeddings(self):
        """Cache GCN embeddings cho eval — không cần gradient."""
        u_gcn, i_gcn          = self._compute_gcn()
        self.cached_user_gcn  = u_gcn.detach()
        self.cached_item_gcn  = i_gcn.detach()

    def forward(self,
                user_id, item_id, history_item_ids,
                category_code, brand_code,
                price_value, avg_rating, rating_number,
                main_category, user_avg, user_var,
                color_code, store_code, parent_asin_code, country_code,
                item_avg_rating,
                user_brand_count, price_deviation, user_recency,
                # FIX 3: thêm history brand/category để enrich GRU
                history_brand_ids=None, history_cat_ids=None):

        # FIX 2: lúc train → tính GCN trong forward để gradient flow
        #         lúc eval  → dùng cache đã tính sẵn
        if self.training:
            all_user_gcn, all_item_gcn = self._compute_gcn()
        else:
            all_user_gcn = self.cached_user_gcn
            all_item_gcn = self.cached_item_gcn

        # ── User & Item embedding + gating GCN ──────────────
        u_emb = self.user_embedding(user_id)
        i_emb = self.item_embedding(item_id)
        u_gcn = all_user_gcn[user_id]
        i_gcn = all_item_gcn[item_id]

        g_u = torch.sigmoid(self.gate_u(torch.cat([u_emb, u_gcn], dim=-1)))
        g_i = torch.sigmoid(self.gate_i(torch.cat([i_emb, i_gcn], dim=-1)))

        u = self.id_dropout(u_emb + g_u * u_gcn)
        i = self.id_dropout(i_emb + g_i * i_gcn)

        # ── FIX 3: Sequential behavior với rich item features ──
        history_gcn = all_item_gcn[history_item_ids]     # [B, T, 64]

        if history_brand_ids is not None and history_cat_ids is not None:
            # Enrich với brand + category embedding của từng item trong history
            h_brand = self.feat_dropout(self.brand_embedding(history_brand_ids))  # [B, T, 32]
            h_cat   = self.feat_dropout(self.category_emb(history_cat_ids))       # [B, T, 16]
            history_input = torch.cat([history_gcn, h_brand, h_cat], dim=-1)      # [B, T, 112]
        else:
            # Fallback: pad với zeros để giữ đúng GRU input size
            B, T, _ = history_gcn.shape
            pad      = torch.zeros(B, T, self.EMB_BRAND + self.EMB_CAT, device=history_gcn.device)
            history_input = torch.cat([history_gcn, pad], dim=-1)

        auto_mask = (history_item_ids != 0).long()
        gru_out, _ = self.gru(history_input)
        u_seq      = self.masked_attn(i, gru_out, auto_mask)
        u_seq      = self.id_dropout(u_seq)

        # ── Categorical embeddings ───────────────────────────
        b           = self.feat_dropout(self.brand_embedding(brand_code))
        c           = self.feat_dropout(self.category_emb(category_code))
        m_cat       = self.feat_dropout(self.main_category_emb(main_category))
        color_emb   = self.feat_dropout(self.color_embedding(color_code))
        store_emb   = self.feat_dropout(self.store_embedding(store_code))
        parent_emb  = self.feat_dropout(self.parent_asin_embedding(parent_asin_code))
        country_emb = self.feat_dropout(self.country_embedding(country_code))

        # ── Numerical features ────────────────────────────────
        price_safe      = torch.clamp(price_value,    min=-5.0, max=5.0)
        rating_safe     = torch.clamp(avg_rating,     min=0.0,  max=5.0)
        rating_num_safe = torch.log1p(torch.clamp(rating_number, min=0.0))
        user_avg_safe   = torch.clamp(user_avg,       min=-1.5, max=1.5)
        user_var_safe   = torch.log1p(torch.clamp(user_var, min=0.0))
        item_avg_safe   = torch.clamp(item_avg_rating, 1.0, 5.0)

        p             = self.num_dropout(torch.tanh(self.price_fc(price_safe.unsqueeze(-1))))
        ua            = self.num_dropout(torch.tanh(self.avg_rating_fc(rating_safe.unsqueeze(-1))))
        ia            = self.num_dropout(torch.tanh(self.rating_num_fc(rating_num_safe.unsqueeze(-1))))
        u_stats       = self.num_dropout(self.user_stat_fc(torch.stack([user_avg_safe, user_var_safe], dim=-1)))
        item_avg_feat = self.num_dropout(torch.tanh(self.item_avg_fc(item_avg_safe.unsqueeze(-1))))

        # Cross interactions
        dot          = torch.sum(u * i, dim=-1, keepdim=True)
        cos          = F.cosine_similarity(u, i, dim=-1, eps=1e-8).unsqueeze(-1)
        item_quality = ua * ia

        # 3 cross-features mới
        ub_feat  = self.num_dropout(torch.tanh(self.user_brand_fc(user_brand_count.unsqueeze(-1))))
        pd_feat  = self.num_dropout(torch.tanh(self.price_dev_fc(price_deviation.unsqueeze(-1))))
        rec_feat = self.num_dropout(torch.tanh(self.recency_fc(user_recency.unsqueeze(-1))))

        b_projected    = self.brand_projector(b)
        user_brand_dot = torch.sum(u * b_projected, dim=-1, keepdim=True)
        user_seq_dot   = torch.sum(u_seq * i,        dim=-1, keepdim=True)

        # ── Concat ───────────────────────────────────────────
        x = torch.cat([
            u, i, u_seq,
            dot, cos,
            p, ua, ia, item_quality, u_stats, item_avg_feat,
            country_emb, color_emb, store_emb, m_cat, parent_emb, b, c,
            ub_feat, pd_feat, rec_feat,
            user_brand_dot, user_seq_dot,
        ], dim=-1)

        # ── FIX 4: MLP với residual connection layer 1→2 ─────
        h1 = self.mlp_drop1(F.leaky_relu(self.mlp_bn1(self.mlp_fc1(x)), 0.1))
        h2_main = self.mlp_fc2(h1)
        h2_res  = self.res_proj(h1)                                   # residual
        h2 = self.mlp_drop2(F.leaky_relu(self.mlp_bn2(h2_main + h2_res), 0.1))
        h3 = self.mlp_drop3(F.leaky_relu(self.mlp_bn3(self.mlp_fc3(h2)), 0.1))
        h4 = F.leaky_relu(self.mlp_fc4(h3), 0.1)

        out = self.output_layer(h4).squeeze(-1)
        out_shifted = (out
                       + self.user_bias(user_id).squeeze(-1)
                       + self.item_bias(item_id).squeeze(-1)
                       + self.global_bias)
        return out_shifted


# ════════════════════════════════════════════════════════════
# 6. KHỞI TẠO MODEL & LOSS
# ════════════════════════════════════════════════════════════

def main():
        # ════════════════════════════════════════════════════════════
    # 1. LOAD DATA & ENCODERS
    # ════════════════════════════════════════════════════════════
    Product_Rating_Data = pd.read_csv("./content/Product_Rating_Data.csv")
    Electronics_Product = pd.read_csv("./content/Electronics_Product(Encoding).csv")
    encoding_dir = "./content/encoder"

    user_encoder           = joblib.load(os.path.join(encoding_dir, 'user_encoder.pkl'))
    item_encoder           = joblib.load(os.path.join(encoding_dir, 'item_encoder.pkl'))
    brand_encoder          = joblib.load(os.path.join(encoding_dir, 'brand_encoder.pkl'))
    category_encoder       = joblib.load(os.path.join(encoding_dir, 'category_encoder.pkl'))
    store_encoder          = joblib.load(os.path.join(encoding_dir, 'store_encoder.pkl'))
    color_encoder          = joblib.load(os.path.join(encoding_dir, 'color_encoder.pkl'))
    parent_encoder         = joblib.load(os.path.join(encoding_dir, 'parent_encoder.pkl'))
    final_category_encoder = joblib.load(os.path.join(encoding_dir, 'final_category_encoder.pkl'))
    main_category_encoder  = joblib.load(os.path.join(encoding_dir, 'main_category_encoder.pkl'))
    print("✅ Đã load thành công toàn bộ các bộ mã hóa!")

    # ════════════════════════════════════════════════════════════
    # 2. FEATURE ENGINEERING
    # ════════════════════════════════════════════════════════════

    # Feature A: User–brand interaction count
    user_brand_counts = (
        Product_Rating_Data
        .groupby(['user_code', 'brand_code'])
        .size()
        .reset_index(name='user_brand_count')
    )
    Product_Rating_Data = Product_Rating_Data.merge(user_brand_counts, on=['user_code', 'brand_code'], how='left')
    ub_scaler = StandardScaler()
    Product_Rating_Data['user_brand_count_scaled'] = ub_scaler.fit_transform(
        np.log1p(Product_Rating_Data[['user_brand_count']])
    )

    # Feature B: Price deviation so với median của category
    cat_price_median = (
        Product_Rating_Data
        .groupby('category_code')['price_scaled']
        .median()
        .reset_index(name='cat_price_median')
    )
    Product_Rating_Data = Product_Rating_Data.merge(cat_price_median, on='category_code', how='left')
    Product_Rating_Data['price_deviation'] = (
        Product_Rating_Data['price_scaled'] - Product_Rating_Data['cat_price_median']
    ).clip(-3, 3)

    # Feature C: User recency
    print(f"[DEBUG] timestamp dtype: {Product_Rating_Data['timestamp'].dtype}")
    print(f"[DEBUG] timestamp samples: {Product_Rating_Data['timestamp'].iloc[:3].tolist()}")

    ts_col = Product_Rating_Data['timestamp']
    if pd.api.types.is_numeric_dtype(ts_col):
        ts_numeric = ts_col.astype('float64')
    else:
        ts_tried = pd.to_numeric(ts_col, errors='coerce')
        if ts_tried.notna().mean() > 0.9:
            ts_numeric = ts_tried
        else:
            ts_numeric = pd.to_datetime(ts_col, errors='coerce').astype('int64') // 10**9
            ts_numeric = ts_numeric.astype('float64')
            ts_median  = ts_numeric.median()
            n_nan      = ts_numeric.isna().sum()
            if n_nan > 0:
                print(f"[WARN] {n_nan} timestamp không parse được, fill bằng median={ts_median:.0f}")
            ts_numeric = ts_numeric.fillna(ts_median)

    Product_Rating_Data['timestamp_numeric'] = ts_numeric
    print(f"[DEBUG] timestamp_numeric NaN count: {Product_Rating_Data['timestamp_numeric'].isna().sum()}")
    print(f"[DEBUG] timestamp_numeric range: {ts_numeric.min():.0f} ~ {ts_numeric.max():.0f}")

    user_max_ts = (
        Product_Rating_Data
        .groupby('user_code')['timestamp_numeric']
        .max()
        .reset_index(name='user_max_ts')
    )
    Product_Rating_Data = Product_Rating_Data.merge(user_max_ts, on='user_code', how='left')
    Product_Rating_Data['user_recency_raw'] = np.log1p(
        (Product_Rating_Data['user_max_ts'] - Product_Rating_Data['timestamp_numeric']).clip(lower=0)
    )
    Product_Rating_Data['user_recency_raw'] = Product_Rating_Data['user_recency_raw'].fillna(0.0)
    recency_scaler = StandardScaler()
    Product_Rating_Data['user_recency_scaled'] = recency_scaler.fit_transform(
        Product_Rating_Data[['user_recency_raw']]
    )

    # FIX 4 (new): Item-level average rating tính từ training data để tránh leakage
    item_avg_map = (
        Product_Rating_Data
        .groupby('asin_code')['rating']
        .mean()
        .reset_index(name='item_avg_rating')
    )
    if 'item_avg_rating' not in Product_Rating_Data.columns:
        Product_Rating_Data = Product_Rating_Data.merge(item_avg_map, on='asin_code', how='left')
        Product_Rating_Data['item_avg_rating'] = Product_Rating_Data['item_avg_rating'].fillna(0.5)

    # Fillna phòng thủ
    for col in ['user_brand_count_scaled', 'price_deviation', 'user_recency_scaled']:
        Product_Rating_Data[col] = Product_Rating_Data[col].fillna(0.0)

    nan_counts = Product_Rating_Data[['user_brand_count_scaled', 'price_deviation', 'user_recency_scaled']].isna().sum()
    assert nan_counts.sum() == 0, f"❌ Còn NaN sau fillna: {nan_counts.to_dict()}"
    print("✅ Cross-features sẵn sàng, không có NaN")

    # ════════════════════════════════════════════════════════════
    # 3. VOCAB SIZES
    # ════════════════════════════════════════════════════════════
    num_users         = int(Product_Rating_Data['user_code'].max() + 1)
    num_items         = int(Product_Rating_Data['asin_code'].max() + 1)
    num_brand         = int(Product_Rating_Data['brand_code'].max() + 1)
    num_country       = int(Product_Rating_Data['country_code'].max() + 1)
    num_category      = int(Product_Rating_Data['category_code'].max() + 1)
    num_main_category = int(Product_Rating_Data['main_category'].max() + 1)
    num_store         = int(Product_Rating_Data['store_code'].max() + 1)
    num_color         = int(Product_Rating_Data['color_code'].max() + 1)
    num_parent_asin   = int(Product_Rating_Data['parent_asin_code'].max() + 1)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\nDimensions: Users={num_users}, Items={num_items}, Brands={num_brand}")
    print(f"Categories: Main={num_main_category}, Category={num_category}")
    print(f"Additional: Stores={num_store}, Parent ASINs={num_parent_asin}, Colors={num_color}, Countries={num_country}")

    # ════════════════════════════════════════════════════════════
    # 4. EDGE INDEX + EDGE WEIGHT
    # ════════════════════════════════════════════════════════════
    edge_index = torch.tensor([
        Product_Rating_Data['user_code'].values,
        Product_Rating_Data['asin_code'].values + num_users
    ], dtype=torch.long)

    raw_weights = torch.tensor(
        Product_Rating_Data['rating'].values, dtype=torch.float32
    ).clamp(min=0.1)

    edge_index  = torch.cat([edge_index, edge_index.flip(0)], dim=1)
    edge_weight = torch.cat([raw_weights, raw_weights], dim=0)
    edge_index  = edge_index.to(device)
    edge_weight = edge_weight.to(device)
    print(f"✅ edge_index shape: {edge_index.shape}, edge_weight shape: {edge_weight.shape}")
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
    model.to(device)

    df_pos     = Product_Rating_Data[Product_Rating_Data['rating'] == 1]
    df_neg     = Product_Rating_Data[Product_Rating_Data['rating'] == 0]
    pos_weight = torch.tensor([len(df_neg) / len(df_pos)]).to(device)
    criterion  = nn.BCEWithLogitsLoss(pos_weight=pos_weight).to(device)

    # FIX 4: weight_decay tăng lên 2e-3
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4, weight_decay=2e-3)
    scheduler = ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=5,
                                min_lr=1e-6)

    # ════════════════════════════════════════════════════════════
    # 7. BALANCING
    # ════════════════════════════════════════════════════════════
    print(f"\n📊 Phân phối gốc:\n{Product_Rating_Data['rating'].value_counts()}")
    df_pos_sampled = df_pos.sample(n=len(df_neg) * 2, random_state=42)
    balanced_df    = pd.concat([df_pos_sampled, df_neg]).sample(frac=1, random_state=42)
    balanced_df    = balanced_df.reset_index(drop=True)
    print(f"\n✅ Sau balancing:\n{balanced_df['rating'].value_counts()}")


    # ════════════════════════════════════════════════════════════
    # 8. CAUSAL HISTORY — cũng build brand/category history
    # ════════════════════════════════════════════════════════════
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


    # ════════════════════════════════════════════════════════════
    # 9. DATASET — thêm history brand/cat
    # ════════════════════════════════════════════════════════════
    class Electronics_RatingDataset(Dataset):
        def __init__(self, df):
            self.user_code          = torch.tensor(df["user_code"].values)
            self.asin               = torch.tensor(df["asin_code"].values)
            self.ratings            = torch.tensor(df["rating"].values, dtype=torch.float32)
            self.category_code      = torch.tensor(df["category_code"].values, dtype=torch.long)
            self.brand_code         = torch.tensor(df["brand_code"].values, dtype=torch.long)
            self.price_values       = torch.tensor(df["price_scaled"].values, dtype=torch.float32)
            self.avg_rating         = torch.tensor(df["average_rating"].values, dtype=torch.float32)
            self.rating_number      = torch.tensor(df["rating_number"].values, dtype=torch.float32)
            self.user_rating_avg    = torch.tensor(df["user_avg_rating"].values, dtype=torch.float32)
            self.user_rate_var      = torch.tensor(df['user_rating_var'].values, dtype=torch.float32)
            self.main_category      = torch.tensor(df["main_category"].values.astype(int), dtype=torch.long)
            self.color_code         = torch.tensor(df["color_code"].values, dtype=torch.long)
            self.store_code         = torch.tensor(df["store_code"].values, dtype=torch.long)
            self.parent_asin_code   = torch.tensor(df["parent_asin_code"].values, dtype=torch.long)
            self.country_code       = torch.tensor(df["country_code"].values, dtype=torch.long)
            self.item_avg_rating    = torch.tensor(df['item_avg_rating'].values, dtype=torch.float32)
            self.user_brand_count   = torch.tensor(df["user_brand_count_scaled"].values, dtype=torch.float32)
            self.price_deviation    = torch.tensor(df["price_deviation"].values, dtype=torch.float32)
            self.user_recency       = torch.tensor(df["user_recency_scaled"].values, dtype=torch.float32)
            # FIX 3: history item/brand/cat
            self.history       = torch.tensor(np.array(df["history_list"].tolist()),       dtype=torch.long)
            self.history_brand = torch.tensor(np.array(df["history_brand_list"].tolist()), dtype=torch.long)
            self.history_cat   = torch.tensor(np.array(df["history_cat_list"].tolist()),   dtype=torch.long)

        def __len__(self):
            return len(self.ratings)

        def __getitem__(self, idx):
            return (
                self.user_code[idx],      self.asin[idx],           self.history[idx],
                self.history_brand[idx],  self.history_cat[idx],
                self.category_code[idx],  self.brand_code[idx],     self.ratings[idx],
                self.price_values[idx],   self.avg_rating[idx],     self.rating_number[idx],
                self.main_category[idx],  self.user_rating_avg[idx], self.user_rate_var[idx],
                self.color_code[idx],     self.store_code[idx],     self.parent_asin_code[idx],
                self.country_code[idx],   self.item_avg_rating[idx],
                self.user_brand_count[idx], self.price_deviation[idx], self.user_recency[idx],
            )


    # ════════════════════════════════════════════════════════════
    # 10. TRAIN / TEST SPLIT
    # ════════════════════════════════════════════════════════════
    train_df, test_df = train_test_split(
        balanced_df, test_size=0.2, random_state=42, stratify=balanced_df['rating']
    )

    train_df = train_df.sort_values(by=["user_code", "timestamp_numeric"]).reset_index(drop=True)
    item_h, brand_h, cat_h         = build_causal_history(train_df, max_len=20)
    train_df['history_list']        = item_h
    train_df['history_brand_list']  = brand_h
    train_df['history_cat_list']    = cat_h

    test_df = test_df.sort_values(by=["user_code", "timestamp_numeric"]).reset_index(drop=True)
    item_h, brand_h, cat_h        = build_causal_history(test_df, max_len=20)
    test_df['history_list']        = item_h
    test_df['history_brand_list']  = brand_h
    test_df['history_cat_list']    = cat_h

    print("⏳ Building causal history (item + brand + cat)... ✅ Done!")

    train_df['rating'] = pd.to_numeric(train_df['rating'], errors='coerce')
    test_df['rating']  = pd.to_numeric(test_df['rating'],  errors='coerce')
    train_df.dropna(subset=['rating'], inplace=True)
    test_df.dropna(subset=['rating'],  inplace=True)

    train_dataset = Electronics_RatingDataset(train_df)
    test_dataset  = Electronics_RatingDataset(test_df)
    train_loader  = DataLoader(train_dataset, batch_size=1024, shuffle=True,
                            num_workers=2, pin_memory=True)
    test_loader   = DataLoader(test_dataset,  batch_size=1024, shuffle=False,
                            num_workers=2, pin_memory=True)

    print(f"Max user_code  : {train_df['user_code'].max()} / {num_users - 1}")
    print(f"Max asin_code  : {train_df['asin_code'].max()} / {num_items - 1}")
    print(f"Max brand_code : {train_df['brand_code'].max()} / {num_brand - 1}")

    cuda_available = torch.cuda.is_available()
    print(f"\nCUDA khả dụng: {cuda_available}")
    if cuda_available:
        print(f"GPU: {torch.cuda.get_device_name(torch.cuda.current_device())}")


    # ════════════════════════════════════════════════════════════
    # 11. TRAIN & EVALUATE FUNCTIONS
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
            user_id           = user_b.to(device).long(),
            item_id           = item_b.to(device).long(),
            history_item_ids  = hist_b.to(device).long(),
            history_brand_ids = hist_brand_b.to(device).long(),
            history_cat_ids   = hist_cat_b.to(device).long(),
            category_code     = cat_b.to(device).long(),
            brand_code        = brand_b.to(device).long(),
            rating            = rating_b.to(device).float(),
            price_value       = price_b.to(device).float(),
            avg_rating        = avg_r.to(device).float(),
            rating_number     = rat_num.to(device).float(),
            main_category     = main_cat.to(device).long(),
            user_avg          = user_avg.to(device).float(),
            user_var          = user_var.to(device).float(),
            color_code        = color_b.to(device).long(),
            store_code        = store_b.to(device).long(),
            parent_asin_code  = parent_b.to(device).long(),
            country_code      = country_b.to(device).long(),
            item_avg_rating   = item_avg_r.to(device).float(),
            user_brand_count  = ub_count.to(device).float(),
            price_deviation   = price_dev.to(device).float(),
            user_recency      = recency_b.to(device).float(),
        )


    def _forward(model, d):
        return model(
            d['user_id'], d['item_id'], d['history_item_ids'],
            d['category_code'], d['brand_code'],
            d['price_value'], d['avg_rating'], d['rating_number'],
            d['main_category'], d['user_avg'], d['user_var'],
            d['color_code'], d['store_code'], d['parent_asin_code'],
            d['country_code'], d['item_avg_rating'],
            d['user_brand_count'], d['price_deviation'], d['user_recency'],
            history_brand_ids=d['history_brand_ids'],
            history_cat_ids=d['history_cat_ids'],
        ).squeeze(-1)


    def train(model, loader, optimizer, criterion, device):
        model.train()
        total_loss = total_correct = total = 0

        for batch in loader:
            d = _unpack_to_device(batch, device)
            optimizer.zero_grad()

            pred = _forward(model, d)
            loss = criterion(pred, d['rating'])
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

            predicted_label = (torch.sigmoid(pred) >= 0.5).float()
            total_correct  += (predicted_label == d['rating']).sum().item()
            total_loss     += loss.item() * d['rating'].size(0)
            total          += d['rating'].size(0)

        return total_loss / total, (total_correct / total) * 100


    def evaluate(model, loader, criterion, device):
        model.eval()
        # Cache GCN một lần duy nhất cho toàn bộ eval loop
        model.update_gcn_embeddings()

        total_loss = total_correct = total = 0
        all_probs, all_preds, all_labels = [], [], []

        with torch.no_grad():
            for batch in loader:
                d = _unpack_to_device(batch, device)
                pred = _forward(model, d)

                loss         = criterion(pred, d['rating'])
                total_loss  += loss.item() * d['rating'].size(0)

                # FIX 1: dùng sigmoid probability cho AUC
                probs = torch.sigmoid(pred)
                preds = (probs >= 0.5).float()

                total_correct += (preds == d['rating']).sum().item()
                total         += d['rating'].size(0)

                all_probs.extend(probs.cpu().numpy())     # probability cho AUC
                all_preds.extend(preds.cpu().numpy())     # binary cho F1/acc
                all_labels.extend(d['rating'].cpu().numpy())

        f1  = f1_score(all_labels, all_preds, zero_division=0)
        # FIX 1: roc_auc_score nhận probability thay vì binary prediction
        auc = roc_auc_score(all_labels, all_probs)
        return total_loss / total, (total_correct / total) * 100, f1, auc


    # ════════════════════════════════════════════════════════════
    # 12. TRAINING LOOP
    # ════════════════════════════════════════════════════════════
    best_loss         = float('inf')
    no_improve_epochs = 0
    EARLY_STOP        = 40

    os.makedirs("./content/weights", exist_ok=True)

    print("-" * 75)
    print(f"{'epoch':<6} | {'train_loss':<10} | {'train_acc':<10} | "
        f"{'test_loss':<10} | {'test_acc':<10} | {'F1':<6} | {'AUC':<7}")
    print("-" * 75)

    for epoch in range(500):
        train_loss, train_acc        = train(model, train_loader, optimizer, criterion, device)
        test_loss, test_acc, f1, auc = evaluate(model, test_loader, criterion, device)

        scheduler.step(test_loss)

        if test_loss < best_loss:
            best_loss         = test_loss
            no_improve_epochs = 0
            torch.save({
                'epoch':                epoch + 1,
                'model_state_dict':     model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'test_acc': test_acc, 'f1': f1, 'auc': auc,
            }, "./content/weights/best_model_v2.pth")
            print(f"--> Saved ep{epoch+1} | acc={test_acc:.2f}% | F1={f1:.4f} | AUC={auc:.4f}")
        else:
            no_improve_epochs += 1
            if no_improve_epochs >= EARLY_STOP:
                print("=== Early stopping ===")
                break

        print(f"{epoch+1:<6} | {train_loss:<10.4f} | {train_acc:<10.2f}% | "
            f"{test_loss:<10.4f} | {test_acc:<10.2f}% | {f1:<6.4f} | {auc:<7.4f}")
if __name__=="__main__":
    main()