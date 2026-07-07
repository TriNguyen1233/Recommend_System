import joblib
import os
import pandas as pd
import torch
from Data_Preprocessing.data_preprocessing import data_preprocessing
from Models.recommend_system import Neural_Network
import numpy as np
import ast
class implement_recommend:
    def __init__(self):
        self.Product_Rating_Data=pd.read_csv("./content/Product_Rating_Data(encoding).csv")
        self.build_model()
        self.Electronic_Product=pd.read_csv("./content/Electronics_Product(Encoding).csv")
        self.Electronice_Rating=pd.read_csv("./content/Electronics_Rating(Encoding).csv")
   
    def load_encoders(self):
        encoding_dir = "./content/encoder"
        return {
            'user':           joblib.load(os.path.join(encoding_dir, 'user_encoder.pkl')),
            'item':           joblib.load(os.path.join(encoding_dir, 'item_encoder.pkl')),
            'brand':          joblib.load(os.path.join(encoding_dir, 'brand_encoder.pkl')),
            'category':       joblib.load(os.path.join(encoding_dir, 'category_encoder.pkl')),
            'store':          joblib.load(os.path.join(encoding_dir, 'store_encoder.pkl')),
            'color':          joblib.load(os.path.join(encoding_dir, 'color_encoder.pkl')),
            'parent':         joblib.load(os.path.join(encoding_dir, 'parent_encoder.pkl')),
            'final_category': joblib.load(os.path.join(encoding_dir, 'final_category_encoder.pkl')),
            'main_category_code':  joblib.load(os.path.join(encoding_dir, 'main_category_encoder.pkl')),
        }
    def build_model(self):
        checkpoint = torch.load('./content/weights/best_model_v2.pth', map_location=torch.device('cpu'),weights_only=False)

        # Khởi tạo model với đúng vocab size từ checkpoint
        edge_index,edge_weight=self.edge_index_weight()
        self.model = Neural_Network(
            num_users        = checkpoint['num_users'],
            num_items        = checkpoint['num_items'],
            num_brand       = checkpoint['num_brands'],
            num_category   = checkpoint['num_categories'],
            num_main_category    = checkpoint['num_main_cats'],
            num_color       = checkpoint['num_colors'],
            num_store       = checkpoint['num_stores'],
            num_parent_asin = checkpoint['num_parent_asins'],
            num_country    = checkpoint['num_countries'],
            edge_index=edge_index, 
            edge_weight=edge_weight,
        )

        self.model.load_state_dict(checkpoint['model_state_dict'])

    def edge_index_weight(self):
        num_users         = int(self.Product_Rating_Data['user_code'].max() + 1)

        edge_index = torch.from_numpy(
            np.vstack([
                self.Product_Rating_Data['user_code'].values,
                self.Product_Rating_Data['asin_code'].values + num_users
            ])
        ).long()

        raw_weights = torch.tensor(
            self.Product_Rating_Data['rating'].values,
            dtype=torch.float32
        ).clamp(min=0.1)

        edge_index = torch.cat(
            [edge_index, edge_index.flip(0)],
            dim=1
        )

        edge_weight = torch.cat(
            [raw_weights, raw_weights],
            dim=0
        )
        return  edge_index,edge_weight
    
    def predict(self, user_id, parent_asin):
        encoders = self.load_encoders()
        user_encoder = encoders['user']

        # Fix 4: đúng label UNKNOWN
        if user_id in user_encoder.classes_:
            user_id_encoded = int(user_encoder.transform([user_id])[0])
        else:
            print(f"User mới: {user_id} → dùng UNKNOWN")
            user_id_encoded = int(user_encoder.transform(['UNKNOWN'])[0])

        checkpoint = torch.load(
            './content/weights/best_model_v2.pth',
            map_location=torch.device('cpu'),
            weights_only=False
        )

        # Fix 2: chỉ filter theo asin, không filter theo user
        product_rating_df = self.Product_Rating_Data[
            self.Product_Rating_Data['parent_asin'] == parent_asin
        ].head(1)

        if product_rating_df.empty:
            print(f"Không tìm thấy sản phẩm: {parent_asin}")
            return None

        # Fix 5: merge thêm thông tin từ Electronics_Product nếu thiếu cột
        needed_cols = ['average_rating', 'rating_number']

        for col in needed_cols:
            if col not in product_rating_df.columns:
                product_rating_df = product_rating_df.merge(
                    self.Electronic_Product[['parent_asin', col]],
                    on='parent_asin', how='left'
                )

        # Fix 1: user_code phải là tensor 1D [1]
        user_code        = torch.tensor([user_id_encoded], dtype=torch.long)
        asin_tensor      = torch.tensor(product_rating_df["asin_code"].values,          dtype=torch.long)
        category_code    = torch.tensor(product_rating_df["category_code"].values,      dtype=torch.long)
        brand_code       = torch.tensor(product_rating_df["brand_code"].values,         dtype=torch.long)
        price_values     = torch.tensor(product_rating_df["price_scaled"].values,       dtype=torch.float32)
        avg_rating       = torch.tensor(product_rating_df["average_rating"].values,     dtype=torch.float32)
        rating_number    = torch.tensor(product_rating_df["rating_number"].values,      dtype=torch.float32)
        user_rating_avg  = torch.tensor(product_rating_df["user_avg_rating"].values,    dtype=torch.float32)
        user_rate_var    = torch.tensor(product_rating_df['user_rating_var'].values,    dtype=torch.float32)
        main_category_code    = torch.tensor(product_rating_df["main_category_code"].values.astype(int), dtype=torch.long)
        color_code       = torch.tensor(product_rating_df["color_code"].values,         dtype=torch.long)
        store_code       = torch.tensor(product_rating_df["store_code"].values,         dtype=torch.long)
        parent_asin_code = torch.tensor(product_rating_df["parent_asin_code"].values,   dtype=torch.long)
        country_code     = torch.tensor(product_rating_df["country_code"].values,       dtype=torch.long)
        item_avg_rating  = torch.tensor(product_rating_df['item_avg_rating'].values,    dtype=torch.float32)
        user_brand_count = torch.tensor(product_rating_df["user_brand_count_scaled"].values, dtype=torch.float32)
        price_deviation  = torch.tensor(product_rating_df["price_deviation"].values,    dtype=torch.float32)
        user_recency     = torch.tensor(product_rating_df["user_recency_scaled"].values, dtype=torch.float32)

        # Clamp index trong range checkpoint
        user_code        = user_code.clamp(0, checkpoint['num_users'] - 1)
        # asin_tensor      = asin_tensor.clamp(0, checkpoint['num_items'] - 1)
        # brand_code       = brand_code.clamp(0, checkpoint['num_brands'] - 1)
        # category_code    = category_code.clamp(0, checkpoint['num_categories'] - 1)
        # main_category_code    = main_category_code.clamp(0, checkpoint['num_main_cats'] - 1)
        # color_code       = color_code.clamp(0, checkpoint['num_colors'] - 1)
        # store_code       = store_code.clamp(0, checkpoint['num_stores'] - 1)
        # parent_asin_code = parent_asin_code.clamp(0, checkpoint['num_parent_asins'] - 1)
        # country_code     = country_code.clamp(0, checkpoint['num_countries'] - 1)

        # History
        cleaned_history = product_rating_df["history_list"].apply(
            lambda x: ast.literal_eval(x) if isinstance(x, str) else x
        ).tolist()
        cleaned_history_brand = product_rating_df["history_brand_list"].apply(
            lambda x: ast.literal_eval(x) if isinstance(x, str) else x
        ).tolist()
        cleaned_history_cat = product_rating_df["history_cat_list"].apply(
            lambda x: ast.literal_eval(x) if isinstance(x, str) else x
        ).tolist()

        history       = torch.tensor(cleaned_history,       dtype=torch.long).clamp(0, checkpoint['num_items'] - 1)
        history_brand = torch.tensor(cleaned_history_brand, dtype=torch.long).clamp(0, checkpoint['num_brands'] - 1)
        history_cat   = torch.tensor(cleaned_history_cat,   dtype=torch.long).clamp(0, checkpoint['num_categories'] - 1)

        self.model.eval()
        self.model.update_gcn_embeddings()

        with torch.no_grad():
            logit = self.model(
                user_code, asin_tensor, history,
                category_code, brand_code,
                price_values, avg_rating, rating_number,
                main_category_code, user_rating_avg, user_rate_var,
                color_code, store_code, parent_asin_code,
                country_code, item_avg_rating,
                user_brand_count, price_deviation, user_recency,
                history_brand_ids=history_brand,
                history_cat_ids=history_cat,
            ).squeeze(-1)

        # Fix 3: sigmoid trước khi quyết định
        prob = torch.sigmoid(logit).item()
        print(f"Probability: {prob:.4f}")

        if prob >= 0.5:
            return True
        else:
            return False


if __name__=="__main__":
    implement=implement_recommend()
    implement.predict(user_id='a',parent_asin='B01A0MTS3W')
