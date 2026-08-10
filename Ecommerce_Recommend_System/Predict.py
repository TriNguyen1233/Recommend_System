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
        self.Product_Rating_Data=pd.read_csv("./content/Electronics_Rating(Encoding).csv")
        self.Product_Data = pd.read_csv("./content/Electronics_Product(Encoding).csv")
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
        checkpoint = torch.load('./content/weights/best_model_v2.pth', map_location=torch.device('cpu'), weights_only=False)
        state_dict = checkpoint['model_state_dict']

        # Khởi tạo model với đúng vocab size từ checkpoint
        edge_index, edge_weight = self.edge_index_weight()
        
        # Nếu checkpoint có edge_index và edge_weight trong state_dict (từ update_graph), dùng shape đó
        if 'edge_index' in state_dict:
            edge_index = state_dict['edge_index']
        if 'edge_weight' in state_dict:
            edge_weight = state_dict['edge_weight']

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

        self.model.load_state_dict(state_dict)

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
    
    def _cold_start_predict(self, parent_asin):
        """
        Popularity-based fallback cho người dùng mới 100% chưa có trong encoder.
        Dự đoán dựa trên độ phổ biến của sản phẩm (average_rating + rating_number).
        
        Returns:
            bool: True nếu sản phẩm đáng gợi ý, False nếu không
        """
        product_info = self.Product_Data[self.Product_Data['parent_asin'] == parent_asin]
        
        if product_info.empty:
            print(f"  [COLD START] Sản phẩm {parent_asin} không tìm thấy → False")
            return False
        
        row = product_info.iloc[0]
        avg_rating = float(row.get('average_rating', 0))
        rating_num = float(row.get('rating_number', 0))
        
        # Score = 70% dựa trên rating trung bình + 30% dựa trên số lượt đánh giá
        rating_score = avg_rating / 5.0
        popularity_score = min(rating_num, 1000) / 1000.0
        score = rating_score * 0.7 + popularity_score * 0.3
        
        is_recommended = score >= 0.5
        
        print(f"\n=========================================")
        print(f" [COLD START] Dự đoán cho Sản phẩm '{parent_asin}':")
        print(f" Avg Rating: {avg_rating:.1f} | Lượt đánh giá: {rating_num:.0f}")
        print(f" Popularity Score: {score:.4f} → {'GỢI Ý ✅' if is_recommended else 'KHÔNG ❌'}")
        print(f"=========================================\n")
        
        return is_recommended

    def predict(self, user_id, parent_asin):
        encoders = self.load_encoders()
        user_encoder = encoders['user']

        # Kiểm tra user mới: nếu chưa có trong encoder → Cold Start fallback
        if user_id not in user_encoder.classes_:
            print(f"[COLD START] User mới: {user_id} → Fallback Popularity-based")
            return self._cold_start_predict(parent_asin)
        
        user_id_encoded = int(user_encoder.transform([user_id])[0])

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
      # === ĐOẠN CODE ĐÃ ĐƯỢC ĐỒNG BỘ ĐÚNG SCHEMA VÀ TRÍCH XUẤT ĐẶC TRƯNG ===
        
        # 1. Tìm thông tin của sản phẩm mục tiêu (target item) từ bảng Product_Data
        current_product_info = self.Product_Data[self.Product_Data['parent_asin'] == parent_asin]
        
        if not current_product_info.empty:
            # Nếu tìm thấy sản phẩm trong kho, trích xuất dữ liệu thô của chính sản phẩm đó
            prod_row = current_product_info.iloc[0]
            c_code = int(prod_row.get('category_code', 0))
            m_code = int(prod_row.get('main_category_code', 0))
            b_code = int(prod_row.get('brand_code', 0))
            col_code = int(prod_row.get('color_code', 0))
            st_code = int(prod_row.get('store_code', 0))
            pa_code = int(prod_row.get('parent_asin_code', 0))
            a_code = int(prod_row.get('asin_code', pa_code)) # fallback sang parent nếu không có asin_code
            
            p_scaled = float(prod_row.get('price_scaled', 0.0))
            avg_rat = float(prod_row.get('average_rating', 0.0))
            rat_num = float(prod_row.get('rating_number', 0.0))
            it_avg_rat = float(prod_row.get('item_avg_rating', avg_rat))
            p_dev = float(prod_row.get('price_deviation', 0.0))
        else:
            # Fallback mặc định nếu mã ASIN truyền vào test không tồn tại trong kho
            c_code = m_code = b_code = col_code = st_code = pa_code = a_code = 0
            p_scaled = avg_rat = rat_num = it_avg_rat = p_dev = 0.0

        # 2. Khởi tạo chính xác các Tensors đầu vào cho MLP (Khớp hoàn toàn cấu trúc shape)
        user_code        = torch.tensor([user_id_encoded], dtype=torch.long)
        asin_tensor      = torch.tensor([a_code],          dtype=torch.long)
        category_code    = torch.tensor([c_code],          dtype=torch.long)
        brand_code       = torch.tensor([b_code],          dtype=torch.long)
        price_values     = torch.tensor([p_scaled],        dtype=torch.float32)
        avg_rating       = torch.tensor([avg_rat],         dtype=torch.float32)
        rating_number    = torch.tensor([rat_num],         dtype=torch.float32)
        item_avg_rating  = torch.tensor([it_avg_rat],      dtype=torch.float32)
        price_deviation  = torch.tensor([p_dev],           dtype=torch.float32)
        main_category_code = torch.tensor([m_code],        dtype=torch.long)
        color_code       = torch.tensor([col_code],        dtype=torch.long)
        store_code       = torch.tensor([st_code],         dtype=torch.long)
        parent_asin_code = torch.tensor([pa_code],         dtype=torch.long)
        
        # Các trường thông tin cố định hoặc lấy từ hồ sơ người dùng (User Profile)
        country_code     = torch.tensor([0],               dtype=torch.long) # Mặc định quốc gia đầu tiên
        
        # Trích xuất thông tin hành vi người dùng (nếu có trong dữ liệu rating, ngược lại để mặc định cho user mới)
        user_history = product_rating_df[product_rating_df['user_id'] == user_id]
        if not user_history.empty:
            u_avg = float(user_history['user_avg_rating'].values[0])
            u_var = float(user_history['user_rating_var'].values[0])
            u_rec = float(user_history['user_recency_scaled'].values[0])
            u_brnd = float(user_history.get('user_brand_count_scaled', [0.0]).values[0])
        else:
            u_avg = 4.0 # Trung bình mặc định của hệ thống
            u_var = 0.5
            u_rec = 0.0
            u_brnd = 0.0

        user_rating_avg  = torch.tensor([u_avg],           dtype=torch.float32)
        user_rate_var    = torch.tensor([u_var],           dtype=torch.float32)
        user_recency     = torch.tensor([u_rec],           dtype=torch.float32)
        user_brand_count = torch.tensor([u_brnd],          dtype=torch.float32)
        
        # === KẾT THÚC ĐOẠN SỬA ===

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
      # === ĐOẠN SỬA LỖI KEYERROR VÀ ZERO-PADDING CHO CHUỖI LỊCH SỬ GRU ===
        
        # 1. Khởi tạo chuỗi rỗng mặc định cho cả 3 danh mục lịch sử
        recent_history_item = []
        recent_history_brand = []
        recent_history_cat = []

        # 2. Kiểm tra nếu có dữ liệu lịch sử trong DataFrame (Ưu tiên nếu là User cũ có tương tác)
        user_history_rows = product_rating_df[product_rating_df['user_id'] == user_id]
        
        if not user_history_rows.empty:
            row_idx = user_history_rows.index[0]
            
            # Xử lý bóc tách chuỗi sản phẩm đã xem
            if "history_list" in product_rating_df.columns:
                raw_h = product_rating_df.at[row_idx, "history_list"]
                recent_history_item = ast.literal_eval(raw_h) if isinstance(raw_h, str) else ([] if pd.isna(raw_h) else raw_h)
            
            # Xử lý bóc tách chuỗi thương hiệu đã xem
            if "history_brand_list" in product_rating_df.columns:
                raw_b = product_rating_df.at[row_idx, "history_brand_list"]
                recent_history_brand = ast.literal_eval(raw_b) if isinstance(raw_b, str) else ([] if pd.isna(raw_b) else raw_b)
                
            # Xử lý bóc tách chuỗi danh mục đã xem
            if "history_cat_list" in product_rating_df.columns:
                raw_c = product_rating_df.at[row_idx, "history_cat_list"]
                recent_history_cat = ast.literal_eval(raw_c) if isinstance(raw_c, str) else ([] if pd.isna(raw_c) else raw_c)

        # 3. Kỹ thuật Zero-Padding: Ép buộc độ dài chuỗi luôn bằng 10 để nạp vào GRU
        max_seq_len = 10
        
        def pad_sequence(seq):
            if not isinstance(seq, list):
                seq = []
            if len(seq) < max_seq_len:
                return [0] * (max_seq_len - len(seq)) + seq
            return seq[-max_seq_len:]

        padded_item  = pad_sequence(recent_history_item)
        padded_brand = pad_sequence(recent_history_brand)
        padded_cat   = pad_sequence(recent_history_cat)

        # 4. Chuyển đổi thành Tensor 2D [1, 10] khớp hoàn toàn với shape của Model suy luận và Giới hạn biên (Clamp)
        history       = torch.tensor([padded_item],  dtype=torch.long).clamp(0, checkpoint.get('num_items', 100000) - 1)
        history_brand = torch.tensor([padded_brand], dtype=torch.long).clamp(0, checkpoint.get('num_brands', 100000) - 1)
        history_cat   = torch.tensor([padded_cat],   dtype=torch.long).clamp(0, checkpoint.get('num_categories', 100000) - 1)

        # 5. Kích hoạt chế độ đánh giá mô hình và cập nhật không gian GCN nhúng
        self.model.eval()
        self.model.update_gcn_embeddings()

        # 6. Tiến hành đưa toàn bộ đặc trưng vào mạng Nơ-ron suy luận song song
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

        # 7. Tính toán xác suất bằng hàm Sigmoid kích hoạt
        prob = torch.sigmoid(logit).item()
        print(f"\n=========================================")
        print(f" Kết quả dự đoán cho User '{user_id}' và Sản phẩm '{parent_asin}':")
        print(f" Xác suất tương tác (Probability): {prob:.4f}")
        print(f"=========================================\n")

        if prob >= 0.5:
            return True
        else:
            return False


if __name__=="__main__":
    implement=implement_recommend()
    implement.predict(user_id='a', parent_asin='B01A0MTS3W')
