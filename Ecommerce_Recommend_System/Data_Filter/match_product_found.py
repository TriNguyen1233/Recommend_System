import pandas as pd
import ast  


rate_doc=pd.read_csv("./train_data/Electronics.csv")
product_doc=pd.read_csv("./train_data/amazon_product_data.csv")
complete_amazon_product_rating=pd.merge(rate_doc, product_doc, on='parent_asin', how='inner')

print(f"Số user sau khi đọc CSV: {rate_doc.user_id.nunique()}")
print(f"Số item sau khi đọc CSV: {rate_doc.parent_asin.nunique()}")
print(f"Số density sau khi đọc CSV: {len(rate_doc) / (rate_doc['user_id'].nunique() * rate_doc['parent_asin'].nunique()):.6f}")
print(f"Số dòng sau khi lọc: {len(rate_doc)}")
print(f"Số dòng sau khi merge: {len(complete_amazon_product_rating)}")
complete_amazon_product_rating.to_csv('./complete_amazon_product_rating.csv', index=False, encoding='utf-8-sig')