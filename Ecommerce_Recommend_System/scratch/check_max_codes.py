import pandas as pd
import torch

checkpoint = torch.load('./content/weights/best_model_v2.pth', map_location='cpu', weights_only=False)
rating_df = pd.read_csv("./content/Electronics_Rating(Encoding).csv")
product_df = pd.read_csv("./content/Electronics_Product(Encoding).csv")

print("=== Checkpoint Vocab Sizes ===")
print("num_users:", checkpoint.get('num_users'))
print("num_items:", checkpoint.get('num_items'))
print("num_brands:", checkpoint.get('num_brands'))
print("num_categories:", checkpoint.get('num_categories'))
print("num_main_cats:", checkpoint.get('num_main_cats'))

print("\n=== rating_df max values ===")
for col in rating_df.columns:
    if 'code' in col:
        print(f"{col}: {rating_df[col].max()}")

print("\n=== product_df max values ===")
for col in product_df.columns:
    if 'code' in col:
        print(f"{col}: {product_df[col].max()}")
