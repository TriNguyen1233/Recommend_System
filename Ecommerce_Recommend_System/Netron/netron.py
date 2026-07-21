import torch
import sys
import os

# Xử lý đường dẫn hệ thống
current_dir = os.path.dirname(os.path.abspath(__file__)) 
project_root = os.path.abspath(os.path.join(current_dir, os.pardir)) 
sys.path.append(project_root)

from Models.recommend_system import Neural_Network

class netron:
    def __init__(self):
        self.num_users = 15626
        self.num_items = 8146
        num_brand = 374
        num_category = 322
        num_main_category = 27
        num_color = 71
        num_store = 424
        num_parent_asin = 6913
        num_country = 14
        
        edge_index = torch.randint(0, self.num_items, (2, 755348), dtype=torch.long)
        edge_weight = torch.rand(755348, dtype=torch.float)
        
        self.model = Neural_Network(
            num_users=self.num_users,
            num_items=self.num_items,
            num_brand=num_brand,
            num_category=num_category,
            num_main_category=num_main_category,
            num_color=num_color,
            num_store=num_store,
            num_parent_asin=num_parent_asin,
            num_country=num_country,
            edge_index=edge_index,
            edge_weight=edge_weight
        )
        
    def write_model_netron(self):
        checkpoint_path = os.path.join(project_root, 'content', 'weights', 'best_model_v2.pth')
        checkpoint = torch.load(checkpoint_path, map_location=torch.device('cpu'), weights_only=False)
        
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.model.eval()  
        
        embedding_dim = 64 
        
        self.model.cached_user_gcn = torch.randn(self.num_users, embedding_dim, dtype=torch.float)
        self.model.cached_item_gcn = torch.randn(self.num_items, embedding_dim, dtype=torch.float)
        
        batch_size = 1  
        seq_len = 5     

        # ✅ FIX 1: Scalar categorical inputs dùng shape (batch_size,) thay vì (batch_size, 1)
        # Tránh embedding output bị thêm chiều dư → (B, 1, D) thay vì (B, D)
        user_id          = torch.randint(0, 15625, (batch_size,), dtype=torch.long)
        item_id          = torch.randint(0, 8145,  (batch_size,), dtype=torch.long)
        category_code    = torch.randint(0, 321,   (batch_size,), dtype=torch.long)
        brand_code       = torch.randint(0, 373,   (batch_size,), dtype=torch.long)
        main_category    = torch.randint(0, 26,    (batch_size,), dtype=torch.long)
        color_code       = torch.randint(0, 70,    (batch_size,), dtype=torch.long)
        store_code       = torch.randint(0, 423,   (batch_size,), dtype=torch.long)
        parent_asin_code = torch.randint(0, 6912,  (batch_size,), dtype=torch.long)
        country_code     = torch.randint(0, 13,    (batch_size,), dtype=torch.long)

        # ✅ FIX 1 (tiếp): Float scalars cũng dùng (batch_size,)
        price_value      = torch.rand((batch_size,), dtype=torch.float)
        avg_rating       = torch.rand((batch_size,), dtype=torch.float) * 5.0
        rating_number    = torch.rand((batch_size,), dtype=torch.float) * 1000.0
        user_avg         = torch.rand((batch_size,), dtype=torch.float) * 5.0
        user_var         = torch.rand((batch_size,), dtype=torch.float)
        item_avg_rating  = torch.rand((batch_size,), dtype=torch.float) * 5.0
        user_brand_count = torch.rand((batch_size,), dtype=torch.float) * 10.0
        price_deviation  = torch.rand((batch_size,), dtype=torch.float)
        user_recency     = torch.rand((batch_size,), dtype=torch.float)

        # Sequence inputs giữ nguyên (batch_size, seq_len)
        history_item_ids  = torch.randint(0, 8145, (batch_size, seq_len), dtype=torch.long)
        history_brand_ids = torch.randint(0, 373,  (batch_size, seq_len), dtype=torch.long)
        history_cat_ids   = torch.randint(0, 321,  (batch_size, seq_len), dtype=torch.long)

        onnx_kwargs = {
            "user_id":          user_id,
            "item_id":          item_id,
            "history_item_ids": history_item_ids,
            "category_code":    category_code,
            "brand_code":       brand_code,
            "price_value":      price_value,
            "avg_rating":       avg_rating,
            "rating_number":    rating_number,
            "main_category":    main_category,
            "user_avg":         user_avg,
            "user_var":         user_var,
            "color_code":       color_code,
            "store_code":       store_code,
            "parent_asin_code": parent_asin_code,
            "country_code":     country_code,
            "item_avg_rating":  item_avg_rating,
            "user_brand_count": user_brand_count,
            "price_deviation":  price_deviation,
            "user_recency":     user_recency,
            "history_brand_ids":history_brand_ids,
            "history_cat_ids":  history_cat_ids,
        }

        print("🔄 Đang xuất mô hình sang định dạng ONNX...")

        orig_forward = self.model.forward

        def safe_forward(*args, **kwargs):
            # ✅ FIX 2: Squeeze mọi scalar input còn dư chiều (B,1) → (B,)
            # Phòng trường hợp caller vẫn truyền vào (B,1) ở các lần dùng khác
            scalar_keys = [
                "user_id", "item_id", "category_code", "brand_code",
                "main_category", "color_code", "store_code",
                "parent_asin_code", "country_code",
                "price_value", "avg_rating", "rating_number",
                "user_avg", "user_var", "item_avg_rating",
                "user_brand_count", "price_deviation", "user_recency",
            ]
            for k in scalar_keys:
                if k in kwargs and kwargs[k].dim() == 2 and kwargs[k].shape[1] == 1:
                    kwargs[k] = kwargs[k].squeeze(1)

            result = orig_forward(*args, **kwargs)

            # ✅ FIX 3: Nếu output của masked_attn (u_seq) còn 3D trong concat,
            # torch.cat sẽ fail. Kiểm tra result shape và squeeze nếu cần.
            # (Phần này chỉ cần nếu model trả về tuple/list chứa tensor 3D)
            if isinstance(result, torch.Tensor) and result.dim() > 2:
                result = result.squeeze(1)
            return result

        self.model.forward = safe_forward

        torch.onnx.export(
            self.model, 
            args=(),  
            kwargs=onnx_kwargs,  
            f="netron_model.onnx",
            opset_version=18,  
            input_names=list(onnx_kwargs.keys()),
            output_names=['output'],
        )
        print("🎉 Tuyệt vời! Đã xuất file netron_model.onnx thành công!")

if __name__ == "__main__":
    app = netron()
    app.write_model_netron()