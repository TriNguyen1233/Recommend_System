
import ollama
import pandas as pd
import os

def main():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(current_dir, "../Data_Preprocessing/train_data/amazon_product_data.csv")
    
    df = pd.read_csv(csv_path)
    
    # TEST TRƯỚC 5 DÒNG: Xem chữ có chịu chạy và lưu vào Postgres không
    print("--- CHẠY THỬ NGHIỆM 5 DÒNG ĐẦU TIÊN ---")
    for text in df.head(5).title:
        vector = title_embedding(text)
        print(f"Title: {text[:30]}... | Vector Length: {len(vector)}")
        print("-" * 50)
        print(f"Vector Sample (first 5 dimensions): {vector[:5]}")

def title_embedding(title):
    # Tránh crash nếu tiêu đề bị rỗng (NaN)
    if not title or pd.isna(title):
        title = "Unknown Product"
        
    response = ollama.embed(
        model='nomic-embed-text',
        input=str(title),
    )
    return response.embeddings[0]

if __name__ == "__main__":
    main()