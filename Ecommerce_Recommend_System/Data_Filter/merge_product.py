import pandas as pd

# 1. Đọc CSV và chuẩn bị danh sách ASIN mục tiêu
df_csv = pd.read_csv('./train_data/Electronics.csv')
df_csv.columns = df_csv.columns.str.strip().str.lower()
asin_set = set(df_csv['parent_asin'].astype(str).str.strip().unique())

# 2. Đọc JSON theo Chunk và LỌC LUÔN
keep_columns = ['details','title', 'price', 'rating_number', 'average_rating', 'main_category','categories','store',
                    'parent_asin','images','features','description','details']
chunks = pd.read_json('../Data/meta_Electronics.jsonl', lines=True, chunksize=10000)

list_df = []
count = 0

print("reading json file and filtering data...")

def extract_image(images):
    main_image = 'unknown'
    if isinstance(images, list) and len(images) > 0:
        main_image= images[0]
    if isinstance(main_image, dict) and 'hi_res' in main_image:
        return main_image['hi_res']
    if isinstance(main_image, dict) and 'large' in main_image:
        return main_image['large']
    return 'unknown'

for chunk in chunks:
    chunk.columns = chunk.columns.str.strip().str.lower()
    
    if 'parent_asin' in chunk.columns:
        # Chuẩn hóa cột parent_asin trong JSON
        chunk['parent_asin'] = chunk['parent_asin'].astype(str).str.strip()
        
        # CHỐT CHẶN QUAN TRỌNG: Chỉ giữ lại những dòng có trong asin_set
        filtered_chunk = chunk[chunk['parent_asin'].isin(asin_set)]
        
        if not filtered_chunk.empty:
            valid_cols = [c for c in keep_columns if c in filtered_chunk.columns]
            list_df.append(filtered_chunk[valid_cols])
            
    count += 1
    if count % 20 == 0:
        print(f" Has scanned {count * 10000} rows...")

# 3. Combine results and export file
if list_df:
    result = pd.concat(list_df, ignore_index=True)
    result = result.drop_duplicates(subset=['parent_asin'], keep='first')
    result['last_category'] = result['categories'].apply(
    lambda x: x[-1] if isinstance(x, list) and len(x) > 0 else 'unknown'
)
    result['image_url']=result['images'].apply(extract_image)
    result.to_csv('./train_data/amazon_product_data.csv', index=False, encoding='utf-8-sig') 
    print(f"Successfully found {len(result)} matching products!")
else:
    print("No matching products found.")