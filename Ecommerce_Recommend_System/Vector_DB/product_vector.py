import ollama
import os
from dotenv import load_dotenv
import psycopg
import pandas as pd

load_dotenv()

def title_embedding(title):
    # Tránh crash nếu tiêu đề bị rỗng (NaN)
    if not title or pd.isna(title):
        title = "Unknown Product"
        
    response = ollama.embed(
        model='nomic-embed-text',
        input=str(title),
    )
    return response.embeddings[0]

def retrieve_product_vector(title):
    db_name = os.getenv("DB_NAME")
    db_user = os.getenv("DB_USER")
    db_password = os.getenv("DB_PASSWORD")
    db_host = os.getenv("DB_HOST")
    db_port = os.getenv("DB_PORT")
    title_vector=title_embedding(title)
    connection_string = f"dbname={db_name} user={db_user} password={db_password} host={db_host} port={db_port}" 
    print(f"Connecting to database: {db_name}...")
    with psycopg.connect(connection_string,autocommit=True) as conn:
         with conn.cursor() as cur:
            retrieve_query = """
                        SELECT 
                            parent_asin, 
                            title, 
                            price, 
                            main_category, 
                            category, 
                            image_url, 
                            store,
                            (1 - (embedding_vector <=> %s::vector)) AS cosine_similarity
                        FROM Products
                        ORDER BY embedding_vector <=> %s::vector ASC
                        LIMIT %s;
                    """
            cur.execute(retrieve_query,(title_vector,title_vector,1000))
            results = cur.fetchall()
            return results
def retrieve_product_vector_with_category(title, category):
    db_name = os.getenv("DB_NAME")
    db_user = os.getenv("DB_USER")
    db_password = os.getenv("DB_PASSWORD")
    db_host = os.getenv("DB_HOST")
    db_port = os.getenv("DB_PORT")
    title_vector=title_embedding(title)
    connection_string = f"dbname={db_name} user={db_user} password={db_password} host={db_host} port={db_port}" 
    print(f"Connecting to database: {db_name}...")
    with psycopg.connect(connection_string,autocommit=True) as conn:
         with conn.cursor() as cur:
            retrieve_query = """    
                        SELECT 
                            parent_asin, 
                            title, 
                            price, 
                            main_category, 
                            category, 
                            image_url, 
                            store,
                            (1 - (embedding_vector <=> %s::vector)) AS cosine_similarity
                        FROM Products
                        WHERE main_category = %s
                        ORDER BY embedding_vector <=> %s::vector ASC
                        LIMIT %s;
                    """
            cur.execute(retrieve_query,(title_vector, str(category), title_vector, 1000))
            results = cur.fetchall()
            return results
         
def main():
    top_product=retrieve_product_vector_with_category("White inkjet printable recordable DVD-R 4.7 GB with 16x write speed", "All Electronics")
    print("-" * 50)
    for product in top_product:
        print(f"ASIN: {product[0]}, Title: {product[1]}, Price: {product[2]}, Main Category: {product[3]}, Category: {product[4]}, Image URL: {product[5]}, Store: {product[6]}, Cosine Similarity: {product[7]:.4f}"
              )
        print("cosine similarity:", product[7])
if __name__ == "__main__":
    main()
    