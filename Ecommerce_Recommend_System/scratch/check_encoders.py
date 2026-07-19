import joblib
import os

encoding_dir = "./content/encoder"
files = os.listdir(encoding_dir)

for f in files:
    if f.endswith('.pkl'):
        path = os.path.join(encoding_dir, f)
        obj = joblib.load(path)
        print(f"File: {f} | Type: {type(obj)}")
        if hasattr(obj, 'classes_'):
            print(f"  classes_: yes, length: {len(obj.classes_)}")
        else:
            print(f"  has no classes_. Attributes: {dir(obj)[:10]}")
