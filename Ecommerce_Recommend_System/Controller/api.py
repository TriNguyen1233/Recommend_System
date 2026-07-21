from typing import Optional
from pydantic import BaseModel
import uvicorn
import os
import sys
from fastapi.middleware.cors import CORSMiddleware
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi import FastAPI

from Predict import implement_recommend
# Tên_File (Viết hoa thường chuẩn) import Tên_Class_Bên_Trong
from Vector_DB import product_vector

app = FastAPI()
class recommend_input(BaseModel):
    user_id:str
    search:str
    category: Optional[str] = None
origins = [
    "http://localhost:5173",    # Cổng mặc định của Vite / React của bạn
    "http://127.0.0.1:5173",
    # Bạn có thể thêm các domain khác nếu deploy lên hosting sau này
]

# 3. Cấu hình Middleware cho phép CORS hoạt động
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,           # Cho phép các nguồn trong danh sách trên
    allow_credentials=True,
    allow_methods=["*"],             # Cho phép tất cả các phương thức (POST, GET, OPTIONS,...)
    allow_headers=["*"],             # Cho phép tất cả các loại Headers gửi lên
)
implement=implement_recommend()
vector=product_vector

@app.post("/api/v1/recommendations")
def recommend_item(input:recommend_input):
    
    recommend_product=[]
    products=[]
    if input.category==None:
        all_product=vector.retrieve_product_vector(input.search)
    else:
        all_product=vector.retrieve_product_vector_with_category(input.search,input.category)
    for product in all_product:
        flag=implement.predict(input.user_id,product[0])
        product_dict={
                "parent_asin":product[0],
                "title":product[1],
                "price":product[2],
                "main_category":product[3],
                "category":product[4],
                "image_url":product[5],
                "store":product[6]
                }
        if(len(product)<20):
            products.append(product_dict)
        if len(recommend_product)>5:
            break;
        if flag:
            recommend_product.append(product_dict)
    return {"recommendations":recommend_product,"products":products}

# ════════════════════════════════════════════════════════════
# INCREMENTAL LEARNING ENDPOINTS
# ════════════════════════════════════════════════════════════

@app.post("/api/v1/incremental/trigger")
def trigger_incremental_training():
    """
    Kích hoạt incremental training thủ công.
    Chạy trong background thread để không block API server.
    """
    import threading
    
    def _run_pipeline():
        try:
            from IncrementalPipeline.run_incremental import run_pipeline
            run_pipeline(force=True)
        except Exception as e:
            print(f"[INCREMENTAL ERROR] {e}")
    
    thread = threading.Thread(target=_run_pipeline, daemon=True)
    thread.start()
    
    return {
        "status": "started",
        "message": "Incremental training đã được kích hoạt trong background."
    }

@app.post("/api/v1/model/reload")
def reload_model():
    """
    Reload model từ checkpoint mới nhất (sau khi incremental training hoàn tất).
    """
    global implement
    try:
        implement = implement_recommend()
        return {"status": "success", "message": "Model đã được reload thành công."}
    except Exception as e:
        return {"status": "error", "message": f"Lỗi reload model: {str(e)}"}

if __name__ == "__main__":
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)
