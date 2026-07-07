import sys

import numpy as np
from sklearn.preprocessing import LabelEncoder, StandardScaler
import os
import torch
import ast
import pandas as pd
import joblib
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class data_preprocessing():
    def __init__(self):
        current_dir = os.path.dirname(os.path.abspath(__file__))
        path_electronics = os.path.join(current_dir, "../Data_Filter/train_data/Electronics.csv")
        path_amazon = os.path.join(current_dir, "../Data_Filter/train_data/amazon_product_data.csv")
        self.Electronics_Rating  = pd.read_csv(path_electronics)
        self.Electronics_Product = pd.read_csv(path_amazon)
        self.user_encoder           = LabelEncoder()
        self.item_encoder           = LabelEncoder()
        self.category_encoder       = LabelEncoder()
        self.brand_encoder          = LabelEncoder()
        self.parent_encoder         = LabelEncoder()
        self.final_category_encoder = LabelEncoder()
        self.main_category_encoder  = LabelEncoder()
        self.store_encoder          = LabelEncoder()
        self.color_encoder          = LabelEncoder()
        self.country_encoder        = LabelEncoder()
        self.scaler                 = StandardScaler()

    def get_details(self, details_str):
        try:
            details = ast.literal_eval(details_str) if isinstance(details_str, str) else {}
        except:
            details = {}
        if not isinstance(details, dict):
            return pd.Series({'brand': 'unk', 'color': 'unk', 'weight': 'unk',
                              'dimensions': 'unk', 'Country of Origin': 'unk'})
        return pd.Series({
            'brand':             details.get('Brand',             'unk'),
            'color':             details.get('Color',             'unk'),
            'weight':            details.get('Item Weight',       'unk'),
            'dimensions':        details.get('Package Dimensions','unk'),
            'Country of Origin': details.get('Country of Origin', 'unk'),
        })

    # ════════════════════════════════════════════════════════
    # STEP 1: Rating preprocessing
    # ════════════════════════════════════════════════════════
    def Electronic_Rating_Preprocessing(self):
        self.Electronics_Rating['rating'] = pd.to_numeric(
            self.Electronics_Rating['rating'], errors='coerce'
        )

        # User stats TRƯỚC khi binarize
        user_avg = self.Electronics_Rating.groupby("user_id")["rating"].mean()
        user_avg = (user_avg - 3) / 2
        self.Electronics_Rating['user_avg_rating'] = self.Electronics_Rating['user_id'].map(user_avg)

        user_var = self.Electronics_Rating.groupby("user_id")["rating"].var().fillna(0)
        self.Electronics_Rating['user_rating_var'] = self.Electronics_Rating['user_id'].map(user_var).fillna(0)

        self.Electronics_Rating['verified_purchase'] = (
            self.Electronics_Rating['verified_purchase']
            .astype(str).str.lower()
            .map({'true': 1, 'false': 0})
            .fillna(0)
        )

        # Binarize rating
        self.Electronics_Rating['rating'] = np.where(
            self.Electronics_Rating['rating'] == 5, 1, 0
        )

        # Fix 2: dùng 'UNKNOWN' (nhất quán với training)
        all_user_ids = list(self.Electronics_Rating["user_id"].unique()) + ["UNKNOWN"]
        self.user_encoder.fit(all_user_ids)
        self.Electronics_Rating["user_code"] = self.user_encoder.transform(
            self.Electronics_Rating["user_id"]
        )

        self.Electronics_Rating["asin_code"] = self.item_encoder.fit_transform(
            self.Electronics_Rating["asin"]
        )

        # Timestamp
        ts_col = self.Electronics_Rating['timestamp']
        if pd.api.types.is_numeric_dtype(ts_col):
            ts_numeric = ts_col.astype('float64')
        else:
            ts_tried = pd.to_numeric(ts_col, errors='coerce')
            if ts_tried.notna().mean() > 0.9:
                ts_numeric = ts_tried
            else:
                ts_numeric = pd.to_datetime(ts_col, errors='coerce').astype('int64') // 10**9
                ts_numeric = ts_numeric.astype('float64')
            ts_numeric = ts_numeric.fillna(ts_numeric.median())

        self.Electronics_Rating['timestamp_numeric'] = ts_numeric

        user_max_ts = (
            self.Electronics_Rating
            .groupby('user_code')['timestamp_numeric']
            .max()
            .reset_index(name='user_max_ts')
        )
        self.Electronics_Rating = self.Electronics_Rating.merge(user_max_ts, on='user_code', how='left')
        self.Electronics_Rating['user_recency_raw'] = np.log1p(
            (self.Electronics_Rating['user_max_ts'] - self.Electronics_Rating['timestamp_numeric']).clip(lower=0)
        ).fillna(0.0)

        self.recency_scaler = StandardScaler()
        self.Electronics_Rating['user_recency_scaled'] = self.recency_scaler.fit_transform(
            self.Electronics_Rating[['user_recency_raw']]
        )

    # ════════════════════════════════════════════════════════
    # STEP 2: Product preprocessing
    # Fix 1: replace tail values TRƯỚC khi encode
    # ════════════════════════════════════════════════════════
    def Electronics_Product_Preprocessing(self):
        cols_to_drop = ['brand', 'color', 'weight', 'dimensions', 'Country of Origin']
        self.Electronics_Product = self.Electronics_Product.drop(
            columns=[c for c in cols_to_drop if c in self.Electronics_Product.columns]
        )
        new_features = self.Electronics_Product['details'].apply(self.get_details)
        self.Electronics_Product = pd.concat([self.Electronics_Product, new_features], axis=1)

        # Fix 1: replace tail → encode (đúng thứ tự như training)
        for col, threshold in [('brand', 2), ('last_category', 2),
                                ('color', 2), ('Country of Origin', 2), ('store', 2)]:
            counts = self.Electronics_Product[col].value_counts()
            tail   = counts[counts <= threshold].index
            self.Electronics_Product[col] = self.Electronics_Product[col].apply(
                lambda x: 'unk' if x in tail else x
            )

        # Price
        self.Electronics_Product["price"] = pd.to_numeric(
            self.Electronics_Product['price'].astype(str).str.replace(r'[^\d.]', '', regex=True),
            errors='coerce'
        )
        self.Electronics_Product["price"] = self.Electronics_Product["price"].fillna(
            self.Electronics_Product["price"].median()
        )
        self.Electronics_Product["price_log"]    = np.log1p(self.Electronics_Product["price"])
        self.Electronics_Product["price_scaled"] = self.scaler.fit_transform(
            self.Electronics_Product[["price_log"]]
        )

        # Encode SAU khi đã replace tail
        self.Electronics_Product["category_code"]   = self.final_category_encoder.fit_transform(
            self.Electronics_Product["last_category"]
        )
        self.Electronics_Product['main_category_code']   = self.main_category_encoder.fit_transform(
            self.Electronics_Product['main_category']
        )
        self.Electronics_Product['parent_asin_code'] = self.parent_encoder.fit_transform(
            self.Electronics_Product['parent_asin']
        )
        self.Electronics_Product['country_code']    = self.country_encoder.fit_transform(
            self.Electronics_Product['Country of Origin']
        )
        self.Electronics_Product['store_code']      = self.store_encoder.fit_transform(
            self.Electronics_Product['store']
        )
        self.Electronics_Product["brand_code"]      = self.brand_encoder.fit_transform(
            self.Electronics_Product["brand"].astype(str)
        )
        self.Electronics_Product["color_code"]      = self.color_encoder.fit_transform(
            self.Electronics_Product["color"].astype(str)
        )

    # ════════════════════════════════════════════════════════
    # STEP 3: Merge + cross features
    # Fix 3: price_deviation tính trên Product_Rating_Data
    # Fix 4: item_avg_rating tính 1 lần duy nhất
    # ════════════════════════════════════════════════════════
    def Product_Rating__Data_Preprocessing(self):
        self.Product_Rating_Data = pd.merge(
            self.Electronics_Rating, self.Electronics_Product,
            on='parent_asin', how='left'
        )
        self.Product_Rating_Data = self.Product_Rating_Data.dropna(
            subset=['asin_code', 'category_code', 'brand_code']
        )

        # Fix 4: item_avg_rating tính 1 lần từ Product_Rating_Data
        item_avg_map = (
            self.Product_Rating_Data
            .groupby('asin_code')['rating']
            .mean()
            .reset_index(name='item_avg_rating')
        )
        self.Product_Rating_Data = self.Product_Rating_Data.merge(
            item_avg_map, on='asin_code', how='left'
        )
        self.Product_Rating_Data['item_avg_rating'] = self.Product_Rating_Data['item_avg_rating'].fillna(0.5)

        # User–brand interaction count
        user_brand_counts = (
            self.Product_Rating_Data
            .groupby(['user_code', 'brand_code'])
            .size()
            .reset_index(name='user_brand_count')
        )
        self.Product_Rating_Data = self.Product_Rating_Data.merge(
            user_brand_counts, on=['user_code', 'brand_code'], how='left'
        )
        ub_scaler = StandardScaler()
        self.Product_Rating_Data['user_brand_count_scaled'] = ub_scaler.fit_transform(
            np.log1p(self.Product_Rating_Data[['user_brand_count']])
        )

        # Fix 3: price_deviation tính trên Product_Rating_Data (đúng như training)
        cat_price_median = (
            self.Product_Rating_Data
            .groupby('category_code')['price_scaled']
            .median()
            .reset_index(name='cat_price_median')
        )
        self.Product_Rating_Data = self.Product_Rating_Data.merge(
            cat_price_median, on='category_code', how='left'
        )
        self.Product_Rating_Data['price_deviation'] = (
            self.Product_Rating_Data['price_scaled'] - self.Product_Rating_Data['cat_price_median']
        ).clip(-3, 3)

        # Fillna
        for col in ['user_brand_count_scaled', 'price_deviation', 'user_recency_scaled']:
            self.Product_Rating_Data[col] = self.Product_Rating_Data[col].fillna(0.0)

        nan_counts = self.Product_Rating_Data[
            ['user_brand_count_scaled', 'price_deviation', 'user_recency_scaled']
        ].isna().sum()
        assert nan_counts.sum() == 0, f"❌ Còn NaN: {nan_counts.to_dict()}"
        print("✅ Cross-features sẵn sàng, không có NaN")

        # Causal history
        self.Product_Rating_Data = self.Product_Rating_Data.sort_values(
            by=["user_code", "timestamp_numeric"]
        ).reset_index(drop=True)
        item_h, brand_h, cat_h = self.build_causal_history(self.Product_Rating_Data, max_len=20)
        self.Product_Rating_Data['history_list']       = item_h
        self.Product_Rating_Data['history_brand_list'] = brand_h
        self.Product_Rating_Data['history_cat_list']   = cat_h

    def build_causal_history(self, df, max_len=20):
        item_histories, brand_histories, cat_histories = [], [], []
        user_item_hist, user_brand_hist, user_cat_hist = {}, {}, {}

        for row in df.itertuples():
            uid, item, brand, cat = row.user_code, row.asin_code, row.brand_code, row.category_code

            def _pad(lst):
                return [0] * (max_len - len(lst)) + lst[-max_len:]

            item_histories.append(_pad(user_item_hist.get(uid, [])))
            brand_histories.append(_pad(user_brand_hist.get(uid, [])))
            cat_histories.append(_pad(user_cat_hist.get(uid, [])))

            user_item_hist.setdefault(uid,  []).append(item)
            user_brand_hist.setdefault(uid, []).append(brand)
            user_cat_hist.setdefault(uid,   []).append(cat)

        return item_histories, brand_histories, cat_histories

    # ════════════════════════════════════════════════════════
    # STEP 4: Save
    # Fix 5: thêm country_encoder
    # ════════════════════════════════════════════════════════
    def save_encoders(self):
        encoding_dir = "./content/encoder"
        os.makedirs(encoding_dir, exist_ok=True)

        encoders = {
            'user_encoder.pkl':            self.user_encoder,
            'item_encoder.pkl':            self.item_encoder,
            'brand_encoder.pkl':           self.brand_encoder,
            'category_encoder.pkl':        self.category_encoder,
            'store_encoder.pkl':           self.store_encoder,
            'color_encoder.pkl':           self.color_encoder,
            'parent_encoder.pkl':          self.parent_encoder,
            'final_category_encoder.pkl':  self.final_category_encoder,
            'main_category_encoder.pkl':   self.main_category_encoder,
            'country_encoder.pkl':         self.country_encoder,   # Fix 5
        }
        for filename, encoder in encoders.items():
            joblib.dump(encoder, os.path.join(encoding_dir, filename))

        print(f"✅ Đã lưu {len(encoders)} encoders vào {encoding_dir}")

        self.Electronics_Product.to_csv("./content/Electronics_Product(Encoding).csv", index=False)
        self.Electronics_Rating.to_csv("./content/Electronics_Rating(Encoding).csv",   index=False)
        self.Product_Rating_Data.to_csv("./content/Product_Rating_Data(encoding).csv", index=False)

        num_users = int(self.Product_Rating_Data['user_code'].max() + 1)
        num_items = int(self.Product_Rating_Data['asin_code'].max() + 1)
        print(f"✅ Hoàn thành! Num Users={num_users}, Num Items={num_items}")


if __name__ == "__main__":
    preprocessor = data_preprocessing()
    preprocessor.Electronic_Rating_Preprocessing()
    preprocessor.Electronics_Product_Preprocessing()
    preprocessor.Product_Rating__Data_Preprocessing()
    preprocessor.save_encoders()