"""
Data Validator Module: Kiểm tra chất lượng và schema dữ liệu mới
trước khi nạp vào pipeline incremental learning.
"""

import pandas as pd


# Các cột bắt buộc mà dữ liệu tương tác mới phải có
REQUIRED_COLUMNS = [
    'user_id',
    'parent_asin',
    'rating',
    'timestamp',
]

# Các cột tùy chọn nhưng hữu ích cho feature engineering
OPTIONAL_COLUMNS = [
    'asin',
    'brand',
    'main_category',
    'category',
    'color',
    'store',
    'price',
    'average_rating',
    'rating_number',
    'verified_purchase',
]


def validate_schema(df):
    """
    Kiểm tra DataFrame có đúng schema (các cột bắt buộc) hay không.
    
    Returns:
        (bool, list[str]): (valid, list of error messages)
    """
    errors = []
    
    if df.empty:
        errors.append("DataFrame rỗng — không có dữ liệu mới.")
        return False, errors
    
    missing_required = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing_required:
        errors.append(f"Thiếu cột bắt buộc: {missing_required}")
    
    missing_optional = [col for col in OPTIONAL_COLUMNS if col not in df.columns]
    if missing_optional:
        print(f"  [VALIDATOR WARN] Thiếu cột tùy chọn (sẽ dùng giá trị mặc định): {missing_optional}")
    
    return len(errors) == 0, errors


def validate_data_quality(df, max_nan_ratio=0.3):
    """
    Kiểm tra chất lượng dữ liệu: tỷ lệ NaN, giá trị ngoài phạm vi.
    
    Args:
        df: DataFrame cần kiểm tra
        max_nan_ratio: Tỷ lệ NaN tối đa cho phép trên mỗi cột bắt buộc
    
    Returns:
        (bool, list[str]): (valid, list of warning/error messages)
    """
    warnings = []
    
    # Kiểm tra tỷ lệ NaN trên cột bắt buộc
    for col in REQUIRED_COLUMNS:
        if col in df.columns:
            nan_ratio = df[col].isna().mean()
            if nan_ratio > max_nan_ratio:
                warnings.append(
                    f"Cột '{col}' có {nan_ratio*100:.1f}% giá trị NaN (ngưỡng: {max_nan_ratio*100:.0f}%)"
                )
    
    # Kiểm tra giá trị rating hợp lệ
    if 'rating' in df.columns:
        invalid_ratings = df['rating'].dropna()
        if not invalid_ratings.empty:
            min_r, max_r = invalid_ratings.min(), invalid_ratings.max()
            if min_r < 0 or max_r > 5:
                warnings.append(f"Rating ngoài phạm vi [0, 5]: min={min_r}, max={max_r}")
    
    # Kiểm tra timestamp
    if 'timestamp' in df.columns:
        ts = pd.to_numeric(df['timestamp'], errors='coerce')
        if ts.isna().mean() > 0.5:
            # Thử parse dạng datetime string
            ts_dt = pd.to_datetime(df['timestamp'], errors='coerce')
            if ts_dt.isna().mean() > 0.5:
                warnings.append("Cột 'timestamp' không thể parse được (>50% lỗi)")
    
    is_valid = len(warnings) == 0
    return is_valid, warnings


def generate_data_report(df):
    """
    Sinh báo cáo thống kê tóm tắt về dữ liệu mới.
    
    Returns:
        dict: Báo cáo thống kê
    """
    report = {
        "total_records": len(df),
        "unique_users": df['user_id'].nunique() if 'user_id' in df.columns else 0,
        "unique_items": df['parent_asin'].nunique() if 'parent_asin' in df.columns else 0,
    }
    
    if 'rating' in df.columns:
        ratings = pd.to_numeric(df['rating'], errors='coerce').dropna()
        report["rating_distribution"] = ratings.value_counts().to_dict()
        report["mean_rating"] = float(ratings.mean())
    
    if 'brand' in df.columns:
        report["unique_brands"] = df['brand'].nunique()
    
    if 'main_category' in df.columns:
        report["unique_categories"] = df['main_category'].nunique()
    
    if 'timestamp' in df.columns:
        ts = pd.to_numeric(df['timestamp'], errors='coerce')
        if ts.notna().any():
            report["timestamp_range"] = {
                "min": float(ts.min()),
                "max": float(ts.max()),
            }
    
    return report


def validate_and_report(df):
    """
    Chạy toàn bộ validation pipeline và in báo cáo.
    
    Returns:
        bool: True nếu dữ liệu đạt yêu cầu, False nếu không
    """
    print("\n" + "=" * 60)
    print("📋 DATA VALIDATION REPORT")
    print("=" * 60)
    
    # 1. Schema check
    schema_ok, schema_errors = validate_schema(df)
    if not schema_ok:
        for err in schema_errors:
            print(f"  ❌ SCHEMA ERROR: {err}")
        return False
    print("  ✅ Schema hợp lệ")
    
    # 2. Quality check
    quality_ok, quality_warnings = validate_data_quality(df)
    if not quality_ok:
        for warn in quality_warnings:
            print(f"  ⚠️  QUALITY WARNING: {warn}")
    else:
        print("  ✅ Chất lượng dữ liệu tốt")
    
    # 3. Statistics report
    report = generate_data_report(df)
    print(f"\n  📊 Thống kê:")
    print(f"     Tổng số bản ghi   : {report['total_records']}")
    print(f"     Số user duy nhất  : {report['unique_users']}")
    print(f"     Số item duy nhất  : {report['unique_items']}")
    if 'mean_rating' in report:
        print(f"     Rating trung bình : {report['mean_rating']:.2f}")
    if 'rating_distribution' in report:
        print(f"     Phân phối rating  : {report['rating_distribution']}")
    
    print("=" * 60 + "\n")
    
    # Trả về True nếu schema OK (quality warnings không block pipeline)
    return schema_ok
